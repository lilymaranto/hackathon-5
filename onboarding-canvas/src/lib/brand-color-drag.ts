export const BRAND_COLOR_DRAG_MIME = "application/x-onboarding-brand-color-hex";

export type BrandColorFieldId =
  | "onboarding"
  | "customer"
  | "button"
  | "workstreamTop"
  | "workstreamBottom";

export function readBrandColorHexFromDataTransfer(dt: DataTransfer): string | null {
  const custom = dt.getData(BRAND_COLOR_DRAG_MIME).trim();
  if (custom) return custom;
  const plain = dt.getData("text/plain").trim();
  if (/^#[0-9a-f]{3,8}$/i.test(plain)) return plain;
  return null;
}

export function setBrandColorDragData(dt: DataTransfer, hex: string): void {
  dt.setData(BRAND_COLOR_DRAG_MIME, hex);
  dt.setData("text/plain", hex);
  dt.effectAllowed = "copy";
}
