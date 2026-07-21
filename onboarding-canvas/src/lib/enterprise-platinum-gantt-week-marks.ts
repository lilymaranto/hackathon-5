import seedJson from "@/lib/enterprise-platinum-gantt-seed.json";
import planSeedsJson from "@/lib/plan-gantt-seeds.json";
import type { PlanOptionId } from "@/lib/types";

export type PlatinumWeekMark = "1" | "x";

export type PlatinumWeekMarks = Record<string, PlatinumWeekMark>;

type SeedRowWithMarks = {
  taskKey: string;
  startWeek: number;
  spanWeeks: number;
  minSpanWeeks: number;
  weekMarks?: PlatinumWeekMarks;
};

const PLATINUM_GANTT_SEED_WITH_MARKS = seedJson as unknown as SeedRowWithMarks[];

const PLAN_GANTT_MARKS_BY_PLAN = planSeedsJson as unknown as Record<
  string,
  { rows: SeedRowWithMarks[] }
>;

function seedRowsForPlan(planOptionId: PlanOptionId): SeedRowWithMarks[] {
  if (planOptionId === "12_week") {
    return PLATINUM_GANTT_SEED_WITH_MARKS;
  }
  return PLAN_GANTT_MARKS_BY_PLAN[planOptionId]?.rows ?? [];
}

export function platinumGanttTaskKeyFromTileId(tileId: string): string {
  return tileId.startsWith("ept_") ? tileId.slice(4) : tileId;
}

export function weekMarksForPlatinumGanttTaskKey(
  taskKey: string,
  planOptionId: PlanOptionId = "12_week",
): PlatinumWeekMarks | undefined {
  const row = seedRowsForPlan(planOptionId).find((r) => r.taskKey === taskKey);
  const marks = row?.weekMarks;
  if (!marks || !Object.keys(marks).length) return undefined;
  return marks;
}

export function weekMarksForPlatinumGanttTile(
  tileId: string,
  planOptionId: PlanOptionId = "12_week",
): PlatinumWeekMarks | undefined {
  return weekMarksForPlatinumGanttTaskKey(platinumGanttTaskKeyFromTileId(tileId), planOptionId);
}

/** Layout derived from Excel `1` / `x` week grid (contiguous columns in the mark map). */
export function layoutFromPlatinumWeekMarks(marks: PlatinumWeekMarks): {
  startWeek: number;
  spanWeeks: number;
  minSpanWeeks: number;
} | null {
  const keys = Object.keys(marks)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!keys.length) return null;
  const oneKeys = keys.filter((k) => marks[String(k)] === "1");
  if (!oneKeys.length) return null;
  const startWeek = keys[0]!;
  const endWeek = keys[keys.length - 1]!;
  return {
    startWeek,
    spanWeeks: endWeek - startWeek + 1,
    minSpanWeeks: oneKeys.length,
  };
}

export function platinumGanttTaskLayoutEditable(marks: PlatinumWeekMarks | undefined): boolean {
  if (!marks) return false;
  return Object.values(marks).some((v) => v === "1");
}

export function applyWeekMarkLayoutToSeedRow<T extends SeedRowWithMarks>(row: T): T {
  const marks = row.weekMarks;
  if (!marks || !Object.keys(marks).length) return row;
  const layout = layoutFromPlatinumWeekMarks(marks);
  if (!layout) return row;
  return {
    ...row,
    startWeek: layout.startWeek,
    spanWeeks: layout.spanWeeks,
    minSpanWeeks: layout.minSpanWeeks,
  };
}
