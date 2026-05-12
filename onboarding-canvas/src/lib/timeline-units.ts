import type { PlanOptionId, TileRecord } from "@/lib/types";
import {
  ENTERPRISE_PLATINUM_TIMELINE_COLUMNS,
  IGNITE_SILVER_TIMELINE_COLUMNS,
  QUICKSTART_GOLD_TIMELINE_COLUMNS,
} from "@/lib/templates";

/** Timeline column indices for placement (weeks, Growth columns, or Ignite month sub-columns). */
export function getTileTimelineUnits(
  planOptionId: PlanOptionId,
  tile: TileRecord,
  durationWeeks: number,
): { startUnit: number; endUnit: number } {
  if (planOptionId === "growth_silver") {
    const s = tile.Start_Week;
    return { startUnit: s, endUnit: s + tile.Span_Weeks - 1 };
  }
  if (planOptionId === "ignite_gold") {
    const maxW = durationWeeks;
    const startW = Math.min(Math.max(tile.Start_Week, 1), maxW);
    const endW = Math.min(startW + tile.Span_Weeks - 1, maxW);
    return { startUnit: startW, endUnit: endW };
  }
  if (planOptionId === "12_week") {
    const maxW = Math.min(durationWeeks, ENTERPRISE_PLATINUM_TIMELINE_COLUMNS);
    const startW = Math.min(Math.max(tile.Start_Week, 1), maxW);
    const endW = Math.min(startW + tile.Span_Weeks - 1, maxW);
    return { startUnit: startW, endUnit: endW };
  }
  if (planOptionId === "ignite_silver") {
    const maxW = Math.min(durationWeeks, IGNITE_SILVER_TIMELINE_COLUMNS);
    const startW = Math.min(Math.max(tile.Start_Week, 1), maxW);
    const endW = Math.min(startW + tile.Span_Weeks - 1, maxW);
    return { startUnit: startW, endUnit: endW };
  }
  if (planOptionId === "quickstart_gold" || planOptionId === "quickstart_silver") {
    const maxW = Math.min(durationWeeks, QUICKSTART_GOLD_TIMELINE_COLUMNS);
    const startW = Math.min(Math.max(tile.Start_Week, 1), maxW);
    const endW = Math.min(startW + tile.Span_Weeks - 1, maxW);
    return { startUnit: startW, endUnit: endW };
  }
  const s = tile.Start_Week;
  return { startUnit: s, endUnit: s + tile.Span_Weeks - 1 };
}
