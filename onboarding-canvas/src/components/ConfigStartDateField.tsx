"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** When false, hides the helper line (e.g. compact slide-over). */
  showHint?: boolean;
};

export function ConfigStartDateField({
  value,
  onChange,
  disabled = false,
  showHint = true,
}: Props) {
  return (
    <label className="flex flex-col gap-0.5 text-xs font-semibold text-[#2c1650]">
      Start Date <span className="font-normal text-[#6b5798]">Optional</span>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full max-w-xs rounded-lg border border-[#d4c9f6] px-3 py-2 text-xs font-normal outline-none focus:border-[#8b30e7] disabled:opacity-50"
      />
      {showHint ? (
        <span className="text-[10px] font-normal text-[#6b5798]">
          When set, month or week headers on the timeline use this date and following periods.
        </span>
      ) : null}
    </label>
  );
}
