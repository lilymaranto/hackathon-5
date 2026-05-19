"use client";

import clsx from "clsx";
import Cropper, { Area } from "react-easy-crop";
import { useOptionalBrandExtract } from "@/components/brand/brand-extract-context";
import {
  getDroppedImageFile,
  isHttpLogoUrl,
  logoSourceDisplayName,
  normalizeLogoHttpUrl,
  readLogoUrlFromDataTransfer,
} from "@/lib/config-logo";
import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const MAX_LOGO_BYTES = 1_500_000;

type UrlApplyState = "idle" | "loading" | "ok" | "fail";

type Props = {
  logoDataUrl: string;
  logoFileName: string;
  disabled?: boolean;
  onChangeLogo: (nextDataUrl: string, nextFileName: string) => void;
  onRemoveLogo: () => void;
  onError: (message: string | null) => void;
};

function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  return binary.length;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read image."));
    image.src = src;
  });
}

async function cropImageToPngDataUrl(source: string, area: Area): Promise<string> {
  const image = await loadImage(source);
  const cropWidth = Math.max(1, Math.round(area.width));
  const cropHeight = Math.max(1, Math.round(area.height));
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not initialize crop canvas.");
  context.drawImage(
    image,
    Math.round(area.x),
    Math.round(area.y),
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );
  const result = canvas.toDataURL("image/png");
  if (!result.startsWith("data:image/png;base64,")) {
    throw new Error("Unable to export cropped logo.");
  }
  return result;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read logo file."));
    reader.readAsDataURL(file);
  });
}

function logoLabelFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "Logo from URL";
  }
}

export function ConfigLogoUploader({
  logoDataUrl,
  logoFileName,
  disabled = false,
  onChangeLogo,
  onRemoveLogo,
  onError,
}: Props) {
  const brandExtract = useOptionalBrandExtract();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [cropSourceDataUrl, setCropSourceDataUrl] = useState("");
  const [cropSourceName, setCropSourceName] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropAspect, setCropAspect] = useState(3);
  const [cropAreaPixels, setCropAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [logoUrlDraft, setLogoUrlDraft] = useState("");
  const [urlProbeSrc, setUrlProbeSrc] = useState("");
  const [urlApplyState, setUrlApplyState] = useState<UrlApplyState>("idle");
  const [urlApplyMessage, setUrlApplyMessage] = useState<string | null>(null);

  const selectedName = useMemo(
    () => logoSourceDisplayName(logoDataUrl, logoFileName),
    [logoDataUrl, logoFileName],
  );

  const canSubmitUrl = useMemo(() => {
    const draft = logoUrlDraft.trim();
    if (!draft) return false;
    return isHttpLogoUrl(draft);
  }, [logoUrlDraft]);

  useEffect(() => {
    if (!logoDataUrl.trim()) {
      setLogoUrlDraft("");
      setUrlProbeSrc("");
      setUrlApplyState("idle");
      setUrlApplyMessage(null);
      return;
    }
    if (isHttpLogoUrl(logoDataUrl)) {
      setLogoUrlDraft(logoDataUrl.trim());
      setUrlApplyState("ok");
      setUrlApplyMessage("Looks good!");
    }
  }, [logoDataUrl]);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!file.type.startsWith("image/")) {
        onError("Logo must be an image file.");
        return false;
      }
      if (file.size > MAX_LOGO_BYTES) {
        onError("Logo file is too large (max 1.5MB).");
        return false;
      }
      return true;
    },
    [onError],
  );

  const startCropFromFile = useCallback(
    async (file: File) => {
      if (disabled) return;
      if (!validateFile(file)) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        if (!dataUrl.startsWith("data:image/")) {
          onError("Logo could not be read as an image.");
          return;
        }
        setCropPosition({ x: 0, y: 0 });
        setCropZoom(1);
        setCropAspect(3);
        setCropAreaPixels(null);
        setCropSourceDataUrl(dataUrl);
        setCropSourceName(file.name);
        setCropOpen(true);
        onError(null);
        setUrlApplyState("idle");
        setUrlApplyMessage(null);
        setUrlProbeSrc("");
      } catch (error) {
        onError(error instanceof Error ? error.message : "Unable to read logo file.");
      }
    },
    [disabled, onError, validateFile],
  );

  const onFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) await startCropFromFile(file);
      event.target.value = "";
    },
    [startCropFromFile],
  );

  const onDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;
      event.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const related = event.relatedTarget;
    if (
      related instanceof Node &&
      dropZoneRef.current?.contains(related)
    ) {
      return;
    }
    setIsDragOver(false);
  }, []);

  const beginLogoUrlApply = useCallback(
    (rawUrl: string) => {
      try {
        const normalized = normalizeLogoHttpUrl(rawUrl);
        setLogoUrlDraft(normalized);
        setUrlApplyState("loading");
        setUrlApplyMessage(null);
        onError(null);
        setUrlProbeSrc(normalized);
      } catch (error) {
        setUrlApplyState("fail");
        setUrlApplyMessage(
          error instanceof Error ? error.message : "Enter a valid http(s) image URL.",
        );
      }
    },
    [onError],
  );

  const onDrop = useCallback(
    async (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;
      const droppedUrl = readLogoUrlFromDataTransfer(event.dataTransfer);
      if (droppedUrl) {
        beginLogoUrlApply(droppedUrl);
        return;
      }
      const file = getDroppedImageFile(event.dataTransfer);
      if (!file) return;
      await startCropFromFile(file);
    },
    [beginLogoUrlApply, disabled, startCropFromFile],
  );

  const onApplyCrop = useCallback(async () => {
    if (!cropAreaPixels) {
      onError("Please choose a crop area.");
      return;
    }
    setIsCropping(true);
    try {
      const croppedDataUrl = await cropImageToPngDataUrl(cropSourceDataUrl, cropAreaPixels);
      const bytes = dataUrlByteLength(croppedDataUrl);
      if (bytes > MAX_LOGO_BYTES) {
        onError("Cropped logo is too large (max 1.5MB). Try a tighter crop.");
        return;
      }
      onChangeLogo(croppedDataUrl, cropSourceName || "Uploaded logo");
      onError(null);
      setCropOpen(false);
      setUrlApplyState("idle");
      setUrlApplyMessage(null);
      setUrlProbeSrc("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to crop logo.");
    } finally {
      setIsCropping(false);
    }
  }, [cropAreaPixels, cropSourceDataUrl, cropSourceName, onChangeLogo, onError]);

  const onUrlProbeLoad = useCallback(() => {
    if (!urlProbeSrc) return;
    const label = logoLabelFromUrl(urlProbeSrc);
    onChangeLogo(urlProbeSrc, label);
    onError(null);
    setUrlApplyState("ok");
    setUrlApplyMessage("Looks good!");
    setUrlProbeSrc("");
  }, [onChangeLogo, onError, urlProbeSrc]);

  const onUrlProbeError = useCallback(() => {
    setUrlApplyState("fail");
    setUrlApplyMessage(
      "Could not load this image. Check the URL or try another format.",
    );
    onError("Could not load logo from URL.");
    setUrlProbeSrc("");
  }, [onError]);

  const onUseLogoUrl = useCallback(() => {
    if (disabled || !canSubmitUrl) return;
    beginLogoUrlApply(logoUrlDraft);
  }, [beginLogoUrlApply, canSubmitUrl, disabled, logoUrlDraft]);

  useEffect(() => {
    if (!brandExtract) return;
    const applier = (url: string) => beginLogoUrlApply(url);
    brandExtract.registerLogoApplier(applier);
    return () => brandExtract.registerLogoApplier(null);
  }, [brandExtract, beginLogoUrlApply]);

  const showUrlFeedback = urlApplyState !== "idle";
  const showSavedLogoPreview = Boolean(logoDataUrl) && urlApplyState !== "loading";

  const dropTargetHandlers = {
    onDragEnter: onDragOver,
    onDragOver,
    onDragLeave,
    onDrop,
  };

  return (
    <>
      <div className="mt-2">
        <p className="text-xs font-semibold text-[#2c1650]">Logo</p>
        <p className="mt-0.5 text-[10px] leading-snug text-[#6b5798]">
          Optional. Use a transparent background when possible (I use remove.bg when needing to take out
          background).
        </p>
      </div>

      <div className="rounded-md border border-[#e8dff9] bg-[#faf8ff] px-3 py-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/avif"
        onChange={onFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        ref={dropZoneRef}
        className={clsx(
          "mt-1.5 rounded-md border border-dashed border-[#d4c9f6] bg-white p-1",
          isDragOver && "border-[#8b30e7] bg-[#f6efff] ring-1 ring-[#8b30e7]/40",
          disabled && "opacity-60",
        )}
        {...dropTargetHandlers}
      >
        <p className="mb-1 text-[10px] text-[#6b5798]">Drag and drop photo here.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-[#d4c9f6] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4a2b7a] hover:bg-[#f6efff] disabled:opacity-50"
            {...dropTargetHandlers}
          >
            Upload photo
          </button>
          <button
            type="button"
            disabled={disabled || !logoDataUrl}
            onClick={() => {
              onRemoveLogo();
              setUrlApplyState("idle");
              setUrlApplyMessage(null);
              setUrlProbeSrc("");
            }}
            className="rounded-md border border-[#d4c9f6] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4a2b7a] hover:bg-[#f6efff] disabled:opacity-50"
            {...dropTargetHandlers}
          >
            Remove photo
          </button>
        </div>
      </div>

      <p className="mt-1.5 text-[10px] font-semibold text-[#2c1650]">Or use an image URL</p>
      <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-start">
        <input
          type="url"
          value={logoUrlDraft}
          disabled={disabled}
          onChange={(event) => {
            setLogoUrlDraft(event.target.value);
            setUrlApplyState("idle");
            setUrlApplyMessage(null);
            onError(null);
          }}
          placeholder="https://example.com/logo.png"
          className="min-w-0 flex-1 rounded-md border border-[#d4c9f6] bg-white px-2 py-1.5 text-[11px] font-normal outline-none focus:border-[#8b30e7] disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !canSubmitUrl || urlApplyState === "loading"}
          onClick={onUseLogoUrl}
          className="shrink-0 rounded-md border border-[#8b30e7] bg-[#f8f4ff] px-3 py-1.5 text-[11px] font-semibold text-[#8b30e7] hover:bg-[#efe6ff] disabled:opacity-50"
        >
          Use photo
        </button>
      </div>

      {urlProbeSrc ? (
        <img
          src={urlProbeSrc}
          alt=""
          className="sr-only"
          onLoad={onUrlProbeLoad}
          onError={onUrlProbeError}
        />
      ) : null}

      {showUrlFeedback ? (
        <div className="mt-1">
          {urlApplyState === "loading" ? (
            <p className="text-[10px] text-[#6b5798]">Loading preview…</p>
          ) : null}
          {urlApplyState === "fail" && urlApplyMessage ? (
            <p className="text-[10px] text-[#cf3a50]">{urlApplyMessage}</p>
          ) : null}
          {urlApplyState === "ok" && urlApplyMessage ? (
            <p className="text-[10px] font-semibold text-[#2c1650]">{urlApplyMessage}</p>
          ) : null}
        </div>
      ) : null}

      {showSavedLogoPreview ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-[#e8dff9] pt-1.5">
          <img
            src={logoDataUrl}
            alt="Config logo preview"
            className="max-h-[90px] w-auto max-w-[220px] rounded-md border border-[#e8dff9] bg-white p-1 object-contain"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="max-w-[14rem] truncate text-[10px] font-semibold text-[#6b5798]">
              {selectedName}
            </span>
            {isHttpLogoUrl(logoDataUrl) ? (
              <span className="max-w-[14rem] truncate text-[10px] text-[#6b5798]" title={logoDataUrl}>
                {logoDataUrl}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      </div>

      {cropOpen ? (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setCropOpen(false)}
            disabled={isCropping}
            aria-label="Close crop dialog"
          />
          <div className="relative z-[1] w-full max-w-3xl rounded-xl border border-[#d7ccf6] bg-white p-4 shadow-2xl">
            <h3 className="text-base font-semibold text-[#2c1650]">Crop logo</h3>
            <p className="mt-1 text-[11px] text-[#6b5798]">Adjust crop before saving your logo.</p>
            <div className="relative mt-3 h-[320px] overflow-hidden rounded-md bg-white">
              <Cropper
                image={cropSourceDataUrl}
                crop={cropPosition}
                zoom={cropZoom}
                aspect={cropAspect}
                onCropChange={setCropPosition}
                onZoomChange={setCropZoom}
                onCropComplete={(_, areaPixels) => setCropAreaPixels(areaPixels)}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#2c1650]">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.01}
                  value={cropZoom}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#2c1650]">
                Crop shape
                <select
                  value={String(cropAspect)}
                  onChange={(event) => setCropAspect(Number(event.target.value))}
                  className="rounded-md border border-[#d4c9f6] bg-white px-2 py-1 text-[11px] font-normal outline-none focus:border-[#8b30e7]"
                >
                  <option value="3">Wide (3:1)</option>
                  <option value="2">Rect (2:1)</option>
                  <option value="1.6">Landscape (16:10)</option>
                  <option value="1">Square</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={isCropping}
                onClick={() => setCropOpen(false)}
                className="rounded-md border border-[#d4c9f6] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4a2b7a] hover:bg-[#f6efff] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCropping}
                onClick={() => void onApplyCrop()}
                className="rounded-md bg-[#801ED7] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#6b18b8] disabled:opacity-50"
              >
                {isCropping ? "Applying..." : "Apply crop"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
