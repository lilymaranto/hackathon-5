import { BRAND_LOGO_DRAG_MIME } from "@/lib/brand-extract-types";

/** Uploaded file / crop output stored as a data URL. */
export function isDataUrlLogo(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value.trim());
}

export function isHttpLogoUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  try {
    const url = new URL(trimmed);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function normalizeLogoHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid logo URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Logo URL must use http or https.");
  }
  if (!url.hostname) {
    throw new Error("Invalid logo URL.");
  }
  return url.toString();
}

/** Read an http(s) logo URL from a drag-and-drop data transfer. */
export function readLogoUrlFromDataTransfer(dt: DataTransfer): string | null {
  const mimeTypes = [
    BRAND_LOGO_DRAG_MIME,
    "text/uri-list",
    "text/plain",
  ];
  for (const mime of mimeTypes) {
    const raw = dt.getData(mime);
    if (!raw.trim()) continue;
    for (const line of raw.split(/\r?\n/)) {
      const candidate = line.trim();
      if (candidate && isHttpLogoUrl(candidate)) return candidate;
    }
  }
  return null;
}

export function getDroppedImageFile(dt: DataTransfer): File | null {
  if (dt.files?.length) {
    const file = dt.files[0];
    if (file?.type.startsWith("image/")) return file;
  }
  if (dt.items) {
    for (const item of dt.items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) return file;
      }
    }
  }
  return null;
}

export function logoSourceDisplayName(logoValue: string, fileName: string): string {
  if (fileName.trim()) return fileName.trim();
  if (isHttpLogoUrl(logoValue)) {
    try {
      return new URL(logoValue.trim()).hostname;
    } catch {
      return "Logo from URL";
    }
  }
  return "Current logo";
}
