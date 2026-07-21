import type { PlanOptionId } from "@/lib/types";
import {
  ENTERPRISE_PLATINUM_GOLD_PLAN_WEEKS,
  maxPlanWeekSpanFromStart as maxPlanWeekSpanForPlan,
  planGanttColumnsPerPlanWeek,
  planWeekRangeToTimelineUnits as planWeekRangeForPlan,
  planWeekToTimelineColumnEnd as planWeekEndForPlan,
  planWeekToTimelineColumnStart as planWeekStartForPlan,
  timelineColumnToPlanWeek as columnToPlanWeekForPlan,
  usesPlanTaskGanttWeekGrid,
} from "@/lib/plan-task-gantt-timeline";

export { ENTERPRISE_PLATINUM_GOLD_PLAN_WEEKS };

/** @deprecated Use {@link planGanttColumnsPerPlanWeek} with `12_week` / `enterprise_gold`. */
export const ENTERPRISE_PLATINUM_GOLD_COLUMNS_PER_PLAN_WEEK = planGanttColumnsPerPlanWeek("12_week");

export function usesEnterprisePlatinumGoldPlanWeekGrid(planOptionId: PlanOptionId): boolean {
  return planOptionId === "12_week" || planOptionId === "enterprise_gold";
}

export { usesPlanTaskGanttWeekGrid as tileUsesPlanWeekGrid };

export function planWeekToTimelineColumnStart(planWeek: number): number {
  return planWeekStartForPlan("12_week", planWeek);
}

export function planWeekToTimelineColumnEnd(planWeek: number): number {
  return planWeekEndForPlan("12_week", planWeek);
}

export function planWeekRangeToTimelineUnits(
  startPlanWeek: number,
  spanPlanWeeks: number,
): { startUnit: number; endUnit: number } {
  return planWeekRangeForPlan("12_week", startPlanWeek, spanPlanWeeks);
}

export function timelineColumnToPlanWeek(column: number): number {
  return columnToPlanWeekForPlan("12_week", column);
}

export function maxPlanWeekSpanFromStart(startPlanWeek: number): number {
  return maxPlanWeekSpanForPlan("12_week", startPlanWeek);
}
