import type { PlanOptionId, TileRecord } from "@/lib/types";
import { GROWTH_SILVER_COLUMNS_PER_WEEK } from "@/lib/constants";
import {
  growthSilverWorkstreamMilestoneEndColumnTrim,
  igniteGoldWorkstreamMilestoneEndColumnTrim,
  igniteSilverWorkstreamMilestoneEndColumnTrim,
  isPlanGanttMilestoneTile,
  planGanttMilestoneExtraTimelineEndColumns,
  resolvePlanGanttMilestoneTimelineUnits,
} from "@/lib/plan-gantt-milestones";
import {
  planGanttTimelineColumnCount,
  planWeekRangeToTimelineUnits,
  usesPlanTaskGanttWeekGrid,
} from "@/lib/plan-task-gantt-timeline";
import {
  ENTERPRISE_PLATINUM_TIMELINE_COLUMNS,
  IGNITE_SILVER_TIMELINE_COLUMNS,
  QUICKSTART_GOLD_TIMELINE_COLUMNS,
} from "@/lib/templates";

export type TileTimelineUnitsContext = {
  /** Plan-task rows used to resolve synthetic Gantt milestone anchors (`Related_Tasks`). */
  planTaskTiles?: readonly TileRecord[];
};

/** Timeline column indices for placement (weeks, Growth columns, or Ignite month sub-columns). */
export function getTileTimelineUnits(
  planOptionId: PlanOptionId,
  tile: TileRecord,
  durationWeeks: number,
  context?: TileTimelineUnitsContext,
): { startUnit: number; endUnit: number } {
  const planTaskTiles = context?.planTaskTiles;

  if (usesPlanTaskGanttWeekGrid(planOptionId, tile)) {
    if (isPlanGanttMilestoneTile(tile) && planTaskTiles?.length) {
      const anchored = resolvePlanGanttMilestoneTimelineUnits(
        planOptionId,
        tile,
        planTaskTiles,
        (anchor) => getTileTimelineUnits(planOptionId, anchor, durationWeeks, context),
      );
      if (anchored) return anchored;
    }

    const units = planWeekRangeToTimelineUnits(planOptionId, tile.Start_Week, tile.Span_Weeks);
    const extraEnd = planGanttMilestoneExtraTimelineEndColumns(planOptionId, tile);
    if (extraEnd > 0) {
      const total = planGanttTimelineColumnCount(planOptionId);
      return { ...units, endUnit: Math.min(total, units.endUnit + extraEnd) };
    }
    return units;
  }
  if (planOptionId === "growth_silver") {
    const s = tile.Start_Week;
    if (tile.Category === "milestone") {
      const width = Math.max(1, tile.Span_Weeks - 1);
      const maxColumn = durationWeeks * GROWTH_SILVER_COLUMNS_PER_WEEK;
      const trimEnd = growthSilverWorkstreamMilestoneEndColumnTrim(tile);
      let endUnit = Math.min(maxColumn, s + width - 1);
      if (trimEnd > 0) endUnit = Math.max(s, endUnit - trimEnd);
      return { startUnit: s, endUnit };
    }
    return { startUnit: s, endUnit: s + tile.Span_Weeks - 1 };
  }
  if (planOptionId === "ignite_gold") {
    const maxW = durationWeeks;
    const startW = Math.min(Math.max(tile.Start_Week, 1), maxW);
    const endW = Math.min(startW + tile.Span_Weeks - 1, maxW);
    const extraEnd = planGanttMilestoneExtraTimelineEndColumns(planOptionId, tile);
    const trimEnd = igniteGoldWorkstreamMilestoneEndColumnTrim(tile);
    let endUnit = Math.min(maxW, endW + extraEnd);
    if (trimEnd > 0) endUnit = Math.max(startW, endUnit - trimEnd);
    return {
      startUnit: startW,
      endUnit,
    };
  }
  if (planOptionId === "12_week" || planOptionId === "enterprise_gold") {
    const maxW = Math.min(durationWeeks, ENTERPRISE_PLATINUM_TIMELINE_COLUMNS);
    const startW = Math.min(Math.max(tile.Start_Week, 1), maxW);
    const endW = Math.min(startW + tile.Span_Weeks - 1, maxW);
    return { startUnit: startW, endUnit: endW };
  }
  if (planOptionId === "ignite_silver") {
    const maxW = Math.min(durationWeeks, IGNITE_SILVER_TIMELINE_COLUMNS);
    const startW = Math.min(Math.max(tile.Start_Week, 1), maxW);
    const endW = Math.min(startW + tile.Span_Weeks - 1, maxW);
    const extraEnd = planGanttMilestoneExtraTimelineEndColumns(planOptionId, tile);
    const trimEnd = igniteSilverWorkstreamMilestoneEndColumnTrim(tile);
    let endUnit = Math.min(maxW, endW + extraEnd);
    if (trimEnd > 0) endUnit = Math.max(startW, endUnit - trimEnd);
    return {
      startUnit: startW,
      endUnit,
    };
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
