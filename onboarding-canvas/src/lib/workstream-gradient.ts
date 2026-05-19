import { WORKSTREAMS } from "@/lib/constants";
import type { Workstream } from "@/lib/types";
import { parseHexColorOptional } from "@/lib/tile-category-colors";

const DEFAULT_GRADIENT_TOP = WORKSTREAMS[0]!.color;
const DEFAULT_GRADIENT_BOTTOM = WORKSTREAMS[WORKSTREAMS.length - 1]!.color;

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

/**
 * When at least one gradient endpoint is set, maps each visible workstream (in display order)
 * to a color stepped evenly from top (first row) to bottom (last row). Missing endpoints use
 * the default Braze workstream rail colors (first / last in {@link WORKSTREAMS}).
 */
export function buildWorkstreamGradientColorMap(
  visibleWorkstreamIdsOrdered: readonly Workstream[],
  topRaw: string | undefined,
  bottomRaw: string | undefined,
): ReadonlyMap<Workstream, string> | undefined {
  const topCustom = parseHexColorOptional(topRaw);
  const bottomCustom = parseHexColorOptional(bottomRaw);
  if (!topCustom && !bottomCustom) return undefined;

  const top = topCustom ?? DEFAULT_GRADIENT_TOP;
  const bottom = bottomCustom ?? DEFAULT_GRADIENT_BOTTOM;

  const n = visibleWorkstreamIdsOrdered.length;
  if (n === 0) return undefined;
  const map = new Map<Workstream, string>();
  for (let i = 0; i < n; i += 1) {
    const stepT = n === 1 ? 0 : i / (n - 1);
    map.set(visibleWorkstreamIdsOrdered[i]!, interpolateHex(top, bottom, stepT));
  }
  return map;
}
