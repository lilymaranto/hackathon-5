import type { BrandExtractPayload } from "@/lib/brand-extract-types";

const STORAGE_PREFIX = "onboarding-canvas-brand-extract:";
/** Session scope for the create-config form (cleared when starting a new config). */
export const BRAND_EXTRACT_CREATE_SCOPE = "create";

function storageKey(scope: string): string {
  return `${STORAGE_PREFIX}${scope}`;
}

export function loadBrandExtractSession(scope: string): BrandExtractPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrandExtractPayload;
    if (!parsed?.domain || !Array.isArray(parsed.logos) || !Array.isArray(parsed.colors)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveBrandExtractSession(scope: string, payload: BrandExtractPayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(storageKey(scope), JSON.stringify(payload));
}

export function clearBrandExtractSession(scope: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(scope));
}

/** After create, attach draft brand search results to the new config id. */
export function migrateBrandExtractSession(fromScope: string, toScope: string): void {
  if (typeof window === "undefined") return;
  const payload = loadBrandExtractSession(fromScope);
  if (payload) {
    saveBrandExtractSession(toScope, payload);
  }
  clearBrandExtractSession(fromScope);
}
