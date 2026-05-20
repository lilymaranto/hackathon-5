"use client";

import { BrandDomainSearch } from "@/components/brand/BrandDomainSearch";
import { BrandExtractResults } from "@/components/brand/BrandExtractResults";
import { BrandExtractProvider } from "@/components/brand/brand-extract-context";
import { ConfigHandsOnKeyboardSupportField } from "@/components/ConfigHandsOnKeyboardSupportField";
import { ConfigLogoUploader } from "@/components/ConfigLogoUploader";
import { ConfigStartDateField } from "@/components/ConfigStartDateField";
import type { BrandColorFieldId } from "@/lib/brand-color-drag";
import { parseHexColorOptional } from "@/lib/tile-category-colors";
import { type ReactNode } from "react";

type LogoUploaderProps = {
  logoDataUrl: string;
  logoFileName: string;
  disabled?: boolean;
  onChangeLogo: (nextDataUrl: string, nextFileName: string) => void;
  onRemoveLogo: () => void;
};

type InnerProps = LogoUploaderProps & {
  children?: ReactNode;
  onError: (message: string | null) => void;
};

type Props = InnerProps & {
  brandExtractScope: string;
  timelineStartDate: string;
  onTimelineStartDateChange: (value: string) => void;
  showTimelineHint?: boolean;
  onApplyColor: (field: BrandColorFieldId, hex: string) => void;
  handsOnKeyboardSupport: boolean;
  partnerName: string;
  onHandsOnKeyboardSupportChange: (value: boolean) => void;
  onPartnerNameChange: (value: string) => void;
};

function BrandAssetsInner({
  children,
  onError,
  logoDataUrl,
  logoFileName,
  disabled,
  onChangeLogo,
  onRemoveLogo,
}: InnerProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-[#2c1650]">Brand Assets</p>
      <BrandDomainSearch disabled={disabled} onError={onError} />
      <BrandExtractResults disabled={disabled} />
      <ConfigLogoUploader
        logoDataUrl={logoDataUrl}
        logoFileName={logoFileName}
        disabled={disabled}
        onChangeLogo={onChangeLogo}
        onRemoveLogo={onRemoveLogo}
        onError={onError}
      />
      {children ? <div className="mt-2 flex flex-col gap-2">{children}</div> : null}
    </div>
  );
}

export function ConfigBrandAssetsSection({
  onApplyColor,
  brandExtractScope,
  timelineStartDate,
  onTimelineStartDateChange,
  showTimelineHint = true,
  handsOnKeyboardSupport,
  partnerName,
  onHandsOnKeyboardSupportChange,
  onPartnerNameChange,
  ...innerProps
}: Props) {
  const applyColor = (field: BrandColorFieldId, hex: string) => {
    const normalized = parseHexColorOptional(hex);
    if (normalized) onApplyColor(field, normalized);
  };

  return (
    <div className="flex flex-col">
      <ConfigStartDateField
        value={timelineStartDate}
        onChange={onTimelineStartDateChange}
        disabled={innerProps.disabled}
        showHint={showTimelineHint}
      />
      <div className="mt-2">
        <ConfigHandsOnKeyboardSupportField
          enabled={handsOnKeyboardSupport}
          partnerName={partnerName}
          disabled={innerProps.disabled}
          onEnabledChange={onHandsOnKeyboardSupportChange}
          onPartnerNameChange={onPartnerNameChange}
        />
      </div>
      <hr className="my-2 border-0 border-t border-[#e8dff9]" aria-hidden />
      <BrandExtractProvider applyColor={applyColor} storageScope={brandExtractScope}>
        <BrandAssetsInner {...innerProps} />
      </BrandExtractProvider>
    </div>
  );
}
