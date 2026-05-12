import { getTileTimelineUnits } from "@/lib/timeline-units";
import type { PlanOptionId, TileRecord } from "@/lib/types";

/**
 * Bucket 1 — “8 columns per month” plans: Enterprise Platinum (`12_week`), Ignite Silver,
 * Quickstart Gold / Silver. Same thresholds as the original single-rule implementation.
 */
function minSpanEightColumnsPerMonth(templateSpanWeeks: number): number {
  if (templateSpanWeeks < 5) return 2;
  if (templateSpanWeeks <= 8) return 4;
  if (templateSpanWeeks < 16) return 8;
  return 16;
}

/**
 * Bucket 2 — Ignite Gold (“4 columns per month”).
 */
function minSpanFourColumnsPerMonth(templateSpanWeeks: number): number {
  if (templateSpanWeeks < 3) return 1;
  if (templateSpanWeeks <= 4) return 2;
  if (templateSpanWeeks <= 7) return 4;
  return 8;
}

/**
 * Bucket 3 — Growth Silver only (“8 columns per plan week” sub-grid).
 */
function minSpanGrowthSilver(templateSpanWeeks: number): number {
  if (templateSpanWeeks < 5) return 2;
  if (templateSpanWeeks <= 10) return 4;
  if (templateSpanWeeks <= 20) return 8;
  return 16;
}

/**
 * Minimum span (timeline units / `Span_Weeks`) when resizing, from the tile’s **template**
 * span from Caboodle (`templateSpanWeeks`), scoped by plan bucket.
 */
export function brazeCoreMinSpanFromTemplateSpan(
  templateSpanWeeks: number,
  planOptionId: PlanOptionId,
): number {
  if (planOptionId === "growth_silver") {
    return minSpanGrowthSilver(templateSpanWeeks);
  }
  if (planOptionId === "ignite_gold") {
    return minSpanFourColumnsPerMonth(templateSpanWeeks);
  }
  return minSpanEightColumnsPerMonth(templateSpanWeeks);
}

/** Largest span that keeps the tile within the timeline grid for the given plan. */
export function maxResizableSpanWeeks(
  planOptionId: PlanOptionId,
  tile: TileRecord,
  durationWeeks: number,
  timelineColumns: number,
): number {
  const { startUnit } = getTileTimelineUnits(planOptionId, tile, durationWeeks);
  const bigEnd = Math.min(
    getTileTimelineUnits(planOptionId, { ...tile, Span_Weeks: 999999 }, durationWeeks).endUnit,
    timelineColumns,
  );
  return Math.max(1, bigEnd - startUnit + 1);
}

export function clampBrazeCoreSpanWeeks(args: {
  templateSpanWeeks: number;
  planOptionId: PlanOptionId;
  tile: TileRecord;
  durationWeeks: number;
  timelineColumns: number;
  requested: number;
}): number {
  if (args.tile.Category === "milestone") {
    return args.tile.Span_Weeks;
  }

  const minS = args.tile.Tile_ID.startsWith("custom_")
    ? 1
    : brazeCoreMinSpanFromTemplateSpan(args.templateSpanWeeks, args.planOptionId);
  const maxS = maxResizableSpanWeeks(
    args.planOptionId,
    args.tile,
    args.durationWeeks,
    args.timelineColumns,
  );
  if (maxS < minS) return maxS;
  return Math.min(maxS, Math.max(minS, Math.round(args.requested)));
}

const AI_DECISIONING_PLAN: PlanOptionId = "ai_decisioning_studio";

/**
 * AI Decisioning chevron bars (not milestones): minimum span follows **template** span —
 * default `Span_Weeks` of 2 may shrink to 1; all other template spans may shrink to 2 only.
 */
export function adsChevronMinSpanFromTemplateSpan(templateSpanWeeks: number): number {
  return templateSpanWeeks === 2 ? 1 : 2;
}

export function clampAdsChevronSpanWeeks(args: {
  templateSpanWeeks: number;
  tile: TileRecord;
  durationWeeks: number;
  timelineColumns: number;
  requested: number;
}): number {
  if (args.tile.Category === "milestone") {
    return args.tile.Span_Weeks;
  }

  const minS = adsChevronMinSpanFromTemplateSpan(args.templateSpanWeeks);
  const maxS = maxResizableSpanWeeks(
    AI_DECISIONING_PLAN,
    args.tile,
    args.durationWeeks,
    args.timelineColumns,
  );
  if (maxS < minS) return maxS;
  return Math.min(maxS, Math.max(minS, Math.round(args.requested)));
}
