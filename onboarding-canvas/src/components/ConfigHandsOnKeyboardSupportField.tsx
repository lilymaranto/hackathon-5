"use client";

type Props = {
  enabled: boolean;
  partnerName: string;
  disabled?: boolean;
  onEnabledChange: (value: boolean) => void;
  onPartnerNameChange: (value: string) => void;
};

const PARTNER_PLACEHOLDER = "Optional";

export function ConfigHandsOnKeyboardSupportField({
  enabled,
  partnerName,
  disabled = false,
  onEnabledChange,
  onPartnerNameChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#2c1650]">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-3.5 w-3.5 shrink-0 accent-[#8b30e7] disabled:opacity-50"
        />
        Hands On Keyboard Support
      </label>
      {enabled ? (
        <label className="flex flex-col gap-1 text-xs font-semibold text-[#2c1650]">
          Partner Name:
          <input
            type="text"
            value={partnerName}
            disabled={disabled}
            placeholder={PARTNER_PLACEHOLDER}
            onChange={(e) => onPartnerNameChange(e.target.value)}
            className="rounded-lg border border-[#d4c9f6] px-3 py-2 text-xs font-normal outline-none placeholder:text-[#9a8ab8] focus:border-[#8b30e7] disabled:opacity-50"
          />
        </label>
      ) : null}
    </div>
  );
}
