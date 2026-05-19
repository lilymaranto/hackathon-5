"use client";

import { useOptionalBrandExtract } from "@/components/brand/brand-extract-context";
import { WORKSTREAMS } from "@/lib/constants";
import type { BrandColorFieldId } from "@/lib/brand-color-drag";
import { handleColorDragOver, handleColorDrop } from "@/lib/droppable-color-zone";
import { parseHexColorOptional } from "@/lib/tile-category-colors";
import clsx from "clsx";
import { useState } from "react";

const DEFAULT_TOP = WORKSTREAMS[0]!.color;
const DEFAULT_BOTTOM = WORKSTREAMS[WORKSTREAMS.length - 1]!.color;

type HalfProps = {
  title: string;
  value: string;
  defaultHex: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  colorFieldId?: BrandColorFieldId;
};

function HalfPicker({
  title,
  value,
  defaultHex,
  onChange,
  disabled,
  colorFieldId,
}: HalfProps) {
  const normalized = parseHexColorOptional(value) ?? "";
  const pickerValue = normalized || defaultHex;
  const brand = useOptionalBrandExtract();
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={clsx(
        "min-w-0 flex-1 rounded-md border border-[#e8dff9] bg-[#faf8ff] px-3 py-1.5 transition",
        dragOver && "border-[#8b30e7] ring-1 ring-[#8b30e7]/40",
      )}
      onDragOver={(e) => {
        if (!brand || !colorFieldId || disabled) return;
        handleColorDragOver(e);
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        if (!brand || !colorFieldId || disabled) return;
        handleColorDrop(e, (hex) => brand.applyColor(colorFieldId, hex));
      }}
    >
      <div className="text-xs font-semibold text-[#2c1650]">{title}</div>
      <div className="mt-1 flex flex-wrap items-end gap-1">
        <label className="flex shrink-0 flex-col gap-1 text-[9px] font-medium text-[#6b5798]">
          <span className="sr-only">{title} color</span>
          <input
            type="color"
            disabled={disabled}
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-[#d4c9f6] bg-white p-0.5 disabled:opacity-50"
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[9px] font-medium text-[#6b5798]">
            <span>Hex</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className={clsx(
                "shrink-0 text-[10px] font-semibold text-[#801ED7] underline-offset-2 hover:underline",
                disabled && "pointer-events-none opacity-50",
              )}
            >
              Use default color
            </button>
          </div>
          <input
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={defaultHex}
            className="mt-0.5 w-full rounded-md border border-[#d4c9f6] bg-white px-2 py-1.5 font-mono text-[10px] outline-none focus:border-[#8b30e7] disabled:opacity-50"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

type Props = {
  workstreamGradientTopColor: string;
  workstreamGradientBottomColor: string;
  onChangeTop: (v: string) => void;
  onChangeBottom: (v: string) => void;
  disabled?: boolean;
  variant?: "drawer" | "page";
};

export function ConfigWorkstreamGradientColorPickers({
  workstreamGradientTopColor,
  workstreamGradientBottomColor,
  onChangeTop,
  onChangeBottom,
  disabled,
  variant = "drawer",
}: Props) {
  const gap = variant === "drawer" ? "gap-[0.45rem]" : "gap-1.5";
  return (
    <fieldset className={clsx("flex flex-col", gap)}>
      <legend className="text-xs font-semibold text-[#2c1650]">Workstream Colors</legend>
      <p className="text-[10px] leading-snug text-[#6b5798]">Optional</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        <HalfPicker
          title="Top:"
          value={workstreamGradientTopColor}
          defaultHex={DEFAULT_TOP}
          onChange={onChangeTop}
          disabled={disabled}
          colorFieldId="workstreamTop"
        />
        <HalfPicker
          title="Bottom:"
          value={workstreamGradientBottomColor}
          defaultHex={DEFAULT_BOTTOM}
          onChange={onChangeBottom}
          disabled={disabled}
          colorFieldId="workstreamBottom"
        />
      </div>
    </fieldset>
  );
}
