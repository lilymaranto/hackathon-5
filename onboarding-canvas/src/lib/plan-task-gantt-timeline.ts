import { GROWTH_SILVER_COLUMNS_PER_WEEK } from "@/lib/constants";
import { isEnterprisePlatinumGanttTile, usesPlanTaskGantt } from "@/lib/enterprise-platinum-gantt";
import planSeedsJson from "@/lib/plan-gantt-seeds.json";
import type { PlanOptionId, TileRecord } from "@/lib/types";
import type { TimelineConfig } from "@/lib/templates";
import {
  ENTERPRISE_PLATINUM_COLUMNS_PER_MONTH,
  getTimelineConfig,
} from "@/lib/templates";

/** Excel plan-tab week columns for Enterprise Platinum / Gold. */
export const ENTERPRISE_PLATINUM_GOLD_PLAN_WEEKS = 28;

/** Gantt-only rail width: 7×8 columns (swimlane stays 6×8 = 48). */
export const ENTERPRISE_PLATINUM_GOLD_GANTT_TIMELINE_COLUMNS =
  ENTERPRISE_PLATINUM_COLUMNS_PER_MONTH * 7;

const PLAN_SEEDS = planSeedsJson as Record<string, { timelineWeeks: number }>;

/** Plan-tab week count from generated seeds (matches Excel plan tabs). */
export function planTabWeekCount(planOptionId: PlanOptionId): number {
  if (planOptionId === "12_week" || planOptionId === "enterprise_gold") {
    return ENTERPRISE_PLATINUM_GOLD_PLAN_WEEKS;
  }
  return PLAN_SEEDS[planOptionId]?.timelineWeeks ?? 1;
}

/** Timeline columns per one Excel plan-tab week (matches swimlane month grid). */
export function planGanttColumnsPerPlanWeek(planOptionId: PlanOptionId): number {
  if (planOptionId === "12_week" || planOptionId === "enterprise_gold") {
    return ENTERPRISE_PLATINUM_GOLD_GANTT_TIMELINE_COLUMNS / ENTERPRISE_PLATINUM_GOLD_PLAN_WEEKS;
  }
  if (planOptionId === "growth_silver") {
    return GROWTH_SILVER_COLUMNS_PER_WEEK;
  }
  return 1;
}

/** Total Gantt rail columns (plan-task view only; swimlane uses `templates.ts` grids). */
export function planGanttTimelineColumnCount(planOptionId: PlanOptionId): number {
  if (planOptionId === "12_week" || planOptionId === "enterprise_gold") {
    return ENTERPRISE_PLATINUM_GOLD_GANTT_TIMELINE_COLUMNS;
  }
  if (planOptionId === "growth_silver") {
    return planTabWeekCount(planOptionId) * GROWTH_SILVER_COLUMNS_PER_WEEK;
  }
  if (planOptionId === "ignite_silver") {
    return planTabWeekCount(planOptionId);
  }
  if (planOptionId === "ignite_gold") {
    return planTabWeekCount(planOptionId);
  }
  if (planOptionId === "quickstart_gold" || planOptionId === "quickstart_silver") {
    return planTabWeekCount(planOptionId);
  }
  return planTabWeekCount(planOptionId);
}

/** Month / phase header config for the plan Gantt (may differ from swimlane). */
export function planGanttTimelineConfig(planOptionId: PlanOptionId): TimelineConfig {
  if (planOptionId === "12_week" || planOptionId === "enterprise_gold") {
    return {
      phases: [
        { name: "Discovery & Planning", span: 16 },
        { name: "Execution", span: 24 },
        { name: "Post Go-Live Support", span: 16 },
      ],
      months: Array.from({ length: 7 }, (_, i) => ({
        name: `Month ${i + 1}`,
        span: ENTERPRISE_PLATINUM_COLUMNS_PER_MONTH,
      })),
    };
  }
  const swim = getTimelineConfig(planOptionId);
  const cols = planGanttTimelineColumnCount(planOptionId);
  if (planOptionId === "quickstart_gold" || planOptionId === "quickstart_silver") {
    const perMonth = cols / Math.max(1, swim.months.length);
    return {
      ...swim,
      months: swim.months.map((m) => ({ ...m, span: perMonth })),
    };
  }
  if (planOptionId === "ignite_gold" || planOptionId === "ignite_silver") {
    const perMonth = cols / Math.max(1, swim.months.length);
    return {
      ...swim,
      months: swim.months.map((m) => ({ ...m, span: perMonth })),
    };
  }
  return swim;
}

export function usesPlanTaskGanttWeekGrid(
  planOptionId: PlanOptionId,
  tile: Pick<TileRecord, "Tile_ID">,
): boolean {
  return usesPlanTaskGantt(planOptionId) && isEnterprisePlatinumGanttTile(tile);
}

function clampPlanWeek(planOptionId: PlanOptionId, planWeek: number): number {
  const max = planTabWeekCount(planOptionId);
  return Math.min(Math.max(Math.round(planWeek), 1), max);
}

export function planWeekToTimelineColumnStart(
  planOptionId: PlanOptionId,
  planWeek: number,
): number {
  const w = clampPlanWeek(planOptionId, planWeek);
  const cppw = planGanttColumnsPerPlanWeek(planOptionId);
  return (w - 1) * cppw + 1;
}

export function planWeekToTimelineColumnEnd(planOptionId: PlanOptionId, planWeek: number): number {
  const w = clampPlanWeek(planOptionId, planWeek);
  const cppw = planGanttColumnsPerPlanWeek(planOptionId);
  const total = planGanttTimelineColumnCount(planOptionId);
  return Math.min(total, w * cppw);
}

export function planWeekRangeToTimelineUnits(
  planOptionId: PlanOptionId,
  startPlanWeek: number,
  spanPlanWeeks: number,
): { startUnit: number; endUnit: number } {
  const span = Math.max(1, Math.round(spanPlanWeeks));
  const start = Math.max(1, Math.round(startPlanWeek));
  const endPlanWeek = Math.min(start + span - 1, planTabWeekCount(planOptionId));
  return {
    startUnit: planWeekToTimelineColumnStart(planOptionId, start),
    endUnit: planWeekToTimelineColumnEnd(planOptionId, endPlanWeek),
  };
}

export function timelineColumnToPlanWeek(planOptionId: PlanOptionId, column: number): number {
  const total = planGanttTimelineColumnCount(planOptionId);
  const c = Math.min(Math.max(Math.round(column), 1), total);
  const cppw = planGanttColumnsPerPlanWeek(planOptionId);
  return Math.min(
    planTabWeekCount(planOptionId),
    Math.max(1, Math.floor((c - 1) / cppw) + 1),
  );
}

export function maxPlanWeekSpanFromStart(planOptionId: PlanOptionId, startPlanWeek: number): number {
  const start = clampPlanWeek(planOptionId, startPlanWeek);
  return planTabWeekCount(planOptionId) - start + 1;
}
