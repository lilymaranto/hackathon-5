"use client";

import { useOptionalBrandExtract } from "@/components/brand/brand-extract-context";
import type { BrandColorFieldId } from "@/lib/brand-color-drag";
import { handleColorDragOver, handleColorDrop } from "@/lib/droppable-color-zone";
import {
  DEFAULT_CUSTOMER_ACTIVITY_TILE_BG,
  DEFAULT_ONBOARDING_SESSION_TILE_BG,
  DEFAULT_TOOLBAR_BUTTON_HEX,
  parseHexColorOptional,
} from "@/lib/tile-category-colors";
import clsx from "clsx";
import { useState } from "react";

type RowProps = {
  label: string;
  description: string;
  value: string;
  defaultHex: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  colorFieldId?: BrandColorFieldId;
};

function ColorRow({
  label,
  description,
  value,
  defaultHex,
  onChange,
  disabled,
  colorFieldId,
}: RowProps) {
  const normalized = parseHexColorOptional(value) ?? "";
  const pickerValue = normalized || defaultHex;
  const brand = useOptionalBrandExtract();
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={clsx(
        "rounded-md border border-[#e8dff9] bg-[#faf8ff] px-3 py-1.5 transition",
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-[9rem]">
          <div className="text-xs font-semibold text-[#2c1650]">{label}</div>
          <p className="mt-0.5 text-[10px] leading-snug text-[#6b5798]">{description}</p>
        </div>
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
        <div className="flex shrink-0 items-end gap-x-3">
          <label className="flex shrink-0">
            <span className="sr-only">{label} color</span>
            <input
              type="color"
              disabled={disabled}
              value={pickerValue}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded border border-[#d4c9f6] bg-white p-0.5 disabled:opacity-50"
            />
          </label>
          <label className="flex min-w-[7.5rem] flex-col gap-0.5 text-[9px] font-medium text-[#6b5798]">
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
      </div>
    </div>
  );
}

type Props = {
  onboardingSessionTileColor: string;
  customerActivityTileColor: string;
  /** Canvas toolbar (View Gantt/Swimlane, +, Save layout); default {@link DEFAULT_TOOLBAR_BUTTON_HEX}. */
  buttonColor: string;
  /** Row label for customer-activity tile color (default “Customer Activity”). */
  customerActivityColorLabel?: string;
  onChangeOnboarding: (v: string) => void;
  onChangeCustomer: (v: string) => void;
  onChangeButton: (v: string) => void;
  disabled?: boolean;
  /** Larger vertical rhythm for the create drawer. */
  variant?: "drawer" | "page";
};

export function ConfigTileCategoryColorPickers({
  onboardingSessionTileColor,
  customerActivityTileColor,
  buttonColor,
  customerActivityColorLabel = "Customer Activity",
  onChangeOnboarding,
  onChangeCustomer,
  onChangeButton,
  disabled,
  variant = "drawer",
}: Props) {
  const gap = variant === "drawer" ? "gap-[0.45rem]" : "gap-1.5";
  return (
    <fieldset className={clsx("flex flex-col", gap)}>
      <legend className="text-xs font-semibold text-[#2c1650]">Tile Colors</legend>
      <p className="text-[10px] leading-snug text-[#6b5798]">Optional</p>
      <ColorRow
        label="Onboarding Session"
        description={`Default ${DEFAULT_ONBOARDING_SESSION_TILE_BG}`}
        value={onboardingSessionTileColor}
        defaultHex={DEFAULT_ONBOARDING_SESSION_TILE_BG}
        onChange={onChangeOnboarding}
        disabled={disabled}
        colorFieldId="onboarding"
      />
      <ColorRow
        label={customerActivityColorLabel}
        description={`Default ${DEFAULT_CUSTOMER_ACTIVITY_TILE_BG}`}
        value={customerActivityTileColor}
        defaultHex={DEFAULT_CUSTOMER_ACTIVITY_TILE_BG}
        onChange={onChangeCustomer}
        disabled={disabled}
        colorFieldId="customer"
      />
      <ColorRow
        label="Toolbar buttons"
        description={`View Gantt / Swimlane, add tile (+), and Save layout. Default ${DEFAULT_TOOLBAR_BUTTON_HEX}`}
        value={buttonColor}
        defaultHex={DEFAULT_TOOLBAR_BUTTON_HEX}
        onChange={onChangeButton}
        disabled={disabled}
        colorFieldId="button"
      />
    </fieldset>
  );
}
