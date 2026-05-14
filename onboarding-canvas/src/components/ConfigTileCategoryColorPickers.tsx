"use client";

import {
  DEFAULT_CUSTOMER_ACTIVITY_TILE_BG,
  DEFAULT_ONBOARDING_SESSION_TILE_BG,
  DEFAULT_TOOLBAR_BUTTON_HEX,
  parseHexColorOptional,
} from "@/lib/tile-category-colors";
import clsx from "clsx";

type RowProps = {
  label: string;
  description: string;
  value: string;
  defaultHex: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

function ColorRow({ label, description, value, defaultHex, onChange, disabled }: RowProps) {
  const normalized = parseHexColorOptional(value) ?? "";
  const pickerValue = normalized || defaultHex;

  return (
    <div className="rounded-md border border-[#e8dff9] bg-[#faf8ff] p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-[#2c1650]">{label}</div>
          <p className="mt-0.5 text-[10px] leading-snug text-[#6b5798]">{description}</p>
        </div>
        <label className="flex shrink-0 flex-col gap-1 text-[9px] font-medium text-[#6b5798]">
          <span className="sr-only">{label} color</span>
          <input
            type="color"
            disabled={disabled}
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded border border-[#d4c9f6] bg-white p-0.5 disabled:opacity-50"
          />
        </label>
        <label className="flex min-w-[7.5rem] flex-col gap-1 text-[9px] font-medium text-[#6b5798]">
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
  const gap = variant === "drawer" ? "gap-[0.9rem]" : "gap-3";
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
      />
      <ColorRow
        label={customerActivityColorLabel}
        description={`Default ${DEFAULT_CUSTOMER_ACTIVITY_TILE_BG}`}
        value={customerActivityTileColor}
        defaultHex={DEFAULT_CUSTOMER_ACTIVITY_TILE_BG}
        onChange={onChangeCustomer}
        disabled={disabled}
      />
      <ColorRow
        label="Toolbar buttons"
        description={`View Gantt / Swimlane, add tile (+), and Save layout. Default ${DEFAULT_TOOLBAR_BUTTON_HEX}`}
        value={buttonColor}
        defaultHex={DEFAULT_TOOLBAR_BUTTON_HEX}
        onChange={onChangeButton}
        disabled={disabled}
      />
    </fieldset>
  );
}
