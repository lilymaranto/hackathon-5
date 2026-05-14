import type { ConfigRecord, TileCategory } from "@/lib/types";
import type { CSSProperties } from "react";

/** Default swimlane / Gantt fills (used when config has no custom hex). */
export const DEFAULT_ONBOARDING_SESSION_TILE_BG = "#300266";
export const DEFAULT_CUSTOMER_ACTIVITY_TILE_BG = "#c9c4ef";
export const DEFAULT_CUSTOMER_ACTIVITY_TILE_BORDER = "#801ed7";

/** Default canvas toolbar accent (View timeline, +, Save layout). */
export const DEFAULT_TOOLBAR_BUTTON_HEX = "#801ed7";

export type ResolvedTileCategoryColors = {
  onboardingBg: string;
  customerBg: string;
  customerBorder: string;
};

/** Parse `#RGB` or `#RRGGBB`; returns normalized `#rrggbb` or undefined. */
export function parseHexColorOptional(raw: unknown): string | undefined {
  let s = String(raw ?? "").trim();
  if (!s) return undefined;
  if (!s.startsWith("#")) s = `#${s}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(s)) {
    const r = s[1]!;
    const g = s[2]!;
    const b = s[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return undefined;
}

export function resolveTileCategoryColorsFromConfig(
  config: Pick<ConfigRecord, "onboardingSessionTileColor" | "customerActivityTileColor">,
): ResolvedTileCategoryColors {
  return {
    onboardingBg:
      parseHexColorOptional(config.onboardingSessionTileColor) ?? DEFAULT_ONBOARDING_SESSION_TILE_BG,
    customerBg:
      parseHexColorOptional(config.customerActivityTileColor) ?? DEFAULT_CUSTOMER_ACTIVITY_TILE_BG,
    customerBorder: DEFAULT_CUSTOMER_ACTIVITY_TILE_BORDER,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = parseHexColorOptional(hex);
  if (!h) return null;
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => clamp255(c).toString(16).padStart(2, "0")).join("")}`;
}

/** Linear mix between two hex colors (`t` = 0 → `a`, 1 → `b`). */
export function mixHexColors(a: string, b: string, t: number): string {
  const A = hexToRgb(parseHexColorOptional(a) ?? DEFAULT_TOOLBAR_BUTTON_HEX);
  const B = hexToRgb(parseHexColorOptional(b) ?? "#000000");
  if (!A || !B) return DEFAULT_TOOLBAR_BUTTON_HEX;
  const u = Math.max(0, Math.min(1, t));
  const r = A.r * (1 - u) + B.r * u;
  const g = A.g * (1 - u) + B.g * u;
  const bl = A.b * (1 - u) + B.b * u;
  return rgbToHex(r, g, bl);
}

/** Primary toolbar button hover (slightly darker than accent). */
export function toolbarPrimaryHoverHex(accent: string): string {
  const h = parseHexColorOptional(accent) ?? DEFAULT_TOOLBAR_BUTTON_HEX;
  return mixHexColors(h, "#000000", 0.18);
}

/** Light tint for outline toolbar button hover background. */
export function toolbarOutlineHoverBgHex(accent: string): string {
  const h = parseHexColorOptional(accent) ?? DEFAULT_TOOLBAR_BUTTON_HEX;
  return mixHexColors("#ffffff", h, 0.07);
}

/** WCAG relative luminance in sRGB space, roughly 0 (black) → 1 (white). */
export function relativeLuminanceFromHex(bgHex: string): number {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return 0;
  const srgb = [rgb.r, rgb.g, rgb.b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}

/** Returns whichever normalized hex has lower relative luminance (the “darker” color). */
export function darkerOfTwoHexes(a: string, b: string): string {
  return relativeLuminanceFromHex(a) <= relativeLuminanceFromHex(b) ? a : b;
}

/**
 * When the user sets at least one custom onboarding or customer tile hex on the config,
 * milestones should use the darker of the two resolved category fills (defaults fill in for unset).
 * When both config fields are empty, returns `undefined` so callers keep product-specific defaults.
 */
export function milestoneAccentHexFromConfig(
  config: Pick<ConfigRecord, "onboardingSessionTileColor" | "customerActivityTileColor">,
): string | undefined {
  const hasCustomOnboarding = parseHexColorOptional(config.onboardingSessionTileColor) !== undefined;
  const hasCustomCustomer = parseHexColorOptional(config.customerActivityTileColor) !== undefined;
  if (!hasCustomOnboarding && !hasCustomCustomer) return undefined;
  const { onboardingBg, customerBg } = resolveTileCategoryColorsFromConfig(config);
  return darkerOfTwoHexes(onboardingBg, customerBg);
}

/** Relative luminance: light fills → dark text (`#1a102b`), darker fills → white. */
export function textColorOnTileBackground(bgHex: string): "#ffffff" | "#1a102b" {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#ffffff";
  const srgb = [rgb.r, rgb.g, rgb.b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
  return L > 0.45 ? "#1a102b" : "#ffffff";
}

export function brazeSwimlaneTileCategoryStyle(
  colors: ResolvedTileCategoryColors,
  category: TileCategory,
): CSSProperties | undefined {
  if (category === "milestone") return undefined;
  if (category === "onboarding_session") {
    return {
      backgroundColor: colors.onboardingBg,
      color: textColorOnTileBackground(colors.onboardingBg),
    };
  }
  return {
    backgroundColor: colors.customerBg,
    color: textColorOnTileBackground(colors.customerBg),
  };
}
