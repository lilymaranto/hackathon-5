import type { PlanOptionId } from "@/lib/types";
import type { TimelineConfig } from "@/lib/templates";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) return false;
  const [y, m, d] = trimmed.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m! - 1 && dt.getDate() === d;
}

export function parseIsoDate(value: string): Date {
  const trimmed = value.trim();
  if (!isValidIsoDate(trimmed)) {
    throw new Error(`Invalid date: ${value}`);
  }
  const [y, m, d] = trimmed.split("-").map(Number);
  return new Date(y!, m! - 1, d);
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatTimelineDateLabel(isoDate: string): string {
  try {
    const dt = parseIsoDate(isoDate);
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return isoDate;
  }
}

/** Mongo configs column: `[date1,date2,...]` with ISO `YYYY-MM-DD` values. */
export function serializeTimelineDates(dates: string[]): string {
  const cleaned = dates.map((d) => d.trim());
  if (cleaned.every((d) => !d)) return "";
  return `[${cleaned.join(",")}]`;
}

export function parseTimelineDatesField(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  let inner = s;
  if (inner.startsWith("[") && inner.endsWith("]")) {
    inner = inner.slice(1, -1);
  }
  const parts = inner.split(",").map((p) => p.trim());
  if (parts.length === 0 || parts.every((p) => !p)) return undefined;
  return parts;
}

export function usesWeeklyTimelineDates(planOptionId: PlanOptionId): boolean {
  return planOptionId === "growth_silver";
}

export function getTimelinePeriodCount(
  planOptionId: PlanOptionId,
  timelineConfig: Pick<TimelineConfig, "months">,
  durationWeeks: number,
): number {
  if (planOptionId === "growth_silver") return Math.max(0, durationWeeks);
  return timelineConfig.months.length;
}

export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const base = parseIsoDate(isoDate);
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return formatIsoDate(next);
}

export function addWeeksToIsoDate(isoDate: string, weeks: number): string {
  const base = parseIsoDate(isoDate);
  const next = new Date(base);
  next.setDate(next.getDate() + weeks * 7);
  return formatIsoDate(next);
}

export function buildTimelineDatesFromStart(
  startIso: string,
  count: number,
  weekly: boolean,
): string[] {
  if (count <= 0) return [];
  const start = startIso.trim();
  if (!isValidIsoDate(start)) return [];
  return Array.from({ length: count }, (_, index) =>
    weekly ? addWeeksToIsoDate(start, index) : addMonthsToIsoDate(start, index),
  );
}

export function patchTimelineDateAtIndex(dates: string[], index: number, value: string): string[] {
  const next = [...dates];
  while (next.length <= index) next.push("");
  next[index] = value.trim();
  return next;
}

export function timelineStartDateFromDates(dates: string[] | undefined): string {
  return dates?.[0]?.trim() ?? "";
}

export function hasTimelineStartDate(dates: string[] | undefined): boolean {
  const start = timelineStartDateFromDates(dates);
  return Boolean(start && isValidIsoDate(start));
}

export function timelinePeriodLabel(
  index: number,
  fallback: string,
  dates: string[] | undefined,
): string {
  const iso = dates?.[index]?.trim();
  if (iso && isValidIsoDate(iso)) return formatTimelineDateLabel(iso);
  return fallback;
}
