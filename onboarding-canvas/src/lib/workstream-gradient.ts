import { WORKSTREAMS } from "@/lib/constants";
import type { Workstream } from "@/lib/types";
import { parseHexColorOptional } from "@/lib/tile-category-colors";

/**
 * Brand rail ramp top → bottom for the canonical workstream stack
 * (governance … enablement). Colors are applied by **row position** in the UI, not fixed per id.
 */
export const BRAZE_WORKSTREAM_RAIL_PALETTE: readonly string[] = [
  "#FFA524",
  "#FFA4FB",
  "#C85EB5",
  "#91186E",
  "#8B1A91",
  "#861CB4",
  "#801ED7",
  "#300266",
] as const;

const DEFAULT_GRADIENT_TOP = BRAZE_WORKSTREAM_RAIL_PALETTE[0]!;
const DEFAULT_GRADIENT_BOTTOM = BRAZE_WORKSTREAM_RAIL_PALETTE[BRAZE_WORKSTREAM_RAIL_PALETTE.length - 1]!;

function rgbFromNormalizedHex(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hexFromRgb(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  return `#${c(r).toString(16).padStart(2, "0")}${c(g).toString(16).padStart(2, "0")}${c(b).toString(16).padStart(2, "0")}`;
}

/** Linear RGB interpolation between two normalized `#rrggbb` colors; `t` in [0, 1]. */
export function interpolateHex(topHex: string, bottomHex: string, t: number): string {
  const topN = parseHexColorOptional(topHex);
  const bottomN = parseHexColorOptional(bottomHex);
  if (!topN || !bottomN) return topN ?? bottomN ?? "#300266";
  const top = rgbFromNormalizedHex(topN);
  const bottom = rgbFromNormalizedHex(bottomN);
  const u = Math.max(0, Math.min(1, t));
  return hexFromRgb(
    top.r + (bottom.r - top.r) * u,
    top.g + (bottom.g - top.g) * u,
    top.b + (bottom.b - top.b) * u,
  ).toLowerCase();
}

function paletteColorAtNormalizedT(t: number): string {
  const palette = BRAZE_WORKSTREAM_RAIL_PALETTE;
  if (palette.length === 1) return palette[0]!;
  const u = Math.max(0, Math.min(1, t));
  const scaled = u * (palette.length - 1);
  const i0 = Math.floor(scaled);
  const i1 = Math.min(i0 + 1, palette.length - 1);
  const frac = scaled - i0;
  return interpolateHex(palette[i0]!, palette[i1]!, frac);
}

/**
 * Rail color for row `index` of `count` visible rows (0 = top).
 * Custom top/bottom → smooth value scale; otherwise → stepped brand palette by position.
 */
export function workstreamRailColorAtDisplayIndex(
  index: number,
  count: number,
  topRaw?: string,
  bottomRaw?: string,
): string {
  if (count <= 0) return DEFAULT_GRADIENT_BOTTOM;
  const topCustom = parseHexColorOptional(topRaw);
  const bottomCustom = parseHexColorOptional(bottomRaw);
  const t = count === 1 ? 0 : index / (count - 1);
  if (topCustom || bottomCustom) {
    const top = topCustom ?? DEFAULT_GRADIENT_TOP;
    const bottom = bottomCustom ?? DEFAULT_GRADIENT_BOTTOM;
    return interpolateHex(top, bottom, t);
  }
  return paletteColorAtNormalizedT(t);
}

/** Default hex for a workstream id in the canonical stack (fallback when order is unknown). */
export function defaultWorkstreamRailColor(workstreamId: Workstream): string {
  const idx = WORKSTREAMS.findIndex((w) => w.id === workstreamId);
  if (idx >= 0 && idx < BRAZE_WORKSTREAM_RAIL_PALETTE.length) {
    return BRAZE_WORKSTREAM_RAIL_PALETTE[idx]!;
  }
  return WORKSTREAMS.find((w) => w.id === workstreamId)?.color ?? "#300266";
}

/**
 * Maps each workstream id to the rail color for its **current display index**
 * (updates when rows are reordered). Custom gradient endpoints override the default ramp.
 */
export function buildWorkstreamGradientColorMap(
  visibleWorkstreamIdsOrdered: readonly Workstream[],
  topRaw: string | undefined,
  bottomRaw: string | undefined,
): ReadonlyMap<Workstream, string> {
  const n = visibleWorkstreamIdsOrdered.length;
  const map = new Map<Workstream, string>();
  for (let i = 0; i < n; i += 1) {
    map.set(
      visibleWorkstreamIdsOrdered[i]!,
      workstreamRailColorAtDisplayIndex(i, n, topRaw, bottomRaw),
    );
  }
  return map;
}
