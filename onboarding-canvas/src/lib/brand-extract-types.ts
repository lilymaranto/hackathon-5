export type BrandExtractLogo = {
  url: string;
};

export type BrandExtractColor = {
  hex: string;
};

export type BrandExtractPayload = {
  domain: string;
  logos: BrandExtractLogo[];
  colors: BrandExtractColor[];
};

export const BRAND_LOGO_DRAG_MIME = "application/x-onboarding-brand-logo-url";
