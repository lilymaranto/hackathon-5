"use client";

import { WORKSTREAMS } from "@/lib/constants";
import { parseHexColorOptional } from "@/lib/tile-category-colors";
import clsx from "clsx";

const DEFAULT_TOP = WORKSTREAMS[0]!.color;
const DEFAULT_BOTTOM = WORKSTREAMS[WORKSTREAMS.length - 1]!.color;

type HalfProps = {
  title: string;
  value: string;
  defaultHex: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

function HalfPicker({ title, value, defaultHex, onChange, disabled }: HalfProps) {
  const normalized = parseHexColorOptional(value) ?? "";
  const pickerValue = normalized || defaultHex;

  return (
    <div className="min-w-0 flex-1 rounded-md border border-[#e8dff9] bg-[#faf8ff] p-3">
      <div className="text-xs font-semibold text-[#2c1650]">{title}</div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
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
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-[9px] font-medium text-[#6b5798]">
          Hex
          <input
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={defaultHex}
            className="w-full rounded-md border border-[#d4c9f6] bg-white px-2 py-1.5 font-mono text-[10px] outline-none focus:border-[#8b30e7] disabled:opacity-50"
            spellCheck={false}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("")}
        className={clsx(
          "mt-2 text-[10px] font-semibold text-[#801ED7] underline-offset-2 hover:underline",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        Use default color
      </button>
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
  const gap = variant === "drawer" ? "gap-[0.9rem]" : "gap-3";
  return (
    <fieldset className={clsx("flex flex-col", gap)}>
      <legend className="text-xs font-semibold text-[#2c1650]">Workstream Colors</legend>
      <p className="text-[10px] leading-snug text-[#6b5798]">Optional</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <HalfPicker
          title="Top:"
          value={workstreamGradientTopColor}
          defaultHex={DEFAULT_TOP}
          onChange={onChangeTop}
          disabled={disabled}
        />
        <HalfPicker
          title="Bottom:"
          value={workstreamGradientBottomColor}
          defaultHex={DEFAULT_BOTTOM}
          onChange={onChangeBottom}
          disabled={disabled}
        />
      </div>
    </fieldset>
  );
}
