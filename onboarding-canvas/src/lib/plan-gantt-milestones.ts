import { isWorkstreamVisibleForChannels } from "@/lib/constants";
import {
  type EnterprisePlatinumGanttLaneId,
  platinumGanttSectionLabelForLane,
  usesPlanTaskGantt,
} from "@/lib/enterprise-platinum-gantt";
import { normalizeMilestoneTitle } from "@/lib/milestone-display-title";
import { planTabWeekCount, planGanttTimelineColumnCount, planWeekRangeToTimelineUnits } from "@/lib/plan-task-gantt-timeline";
import type { ChannelPreferences, PlanOptionId, TileRecord, Workstream } from "@/lib/types";

export const PLAN_GANTT_MILESTONE_TILE_PREFIX = "gantt_ms_";
export const PLAN_GANTT_BLANK_MILESTONE_PREFIX = "gantt_ms_blank_";

/** Synthetic milestone → plan-task row anchor (`Related_Tasks` holds anchor `Tile_ID`). */
export const PLAN_GANTT_MILESTONE_ANCHOR_FIELD = "Related_Tasks" as const;

export function isPlanGanttMilestoneTile(tile: Pick<TileRecord, "Tile_ID">): boolean {
  return tile.Tile_ID.startsWith(PLAN_GANTT_MILESTONE_TILE_PREFIX);
}

export function planGanttMilestoneSourceTileId(tileId: string): string | undefined {
  if (tileId.startsWith(PLAN_GANTT_BLANK_MILESTONE_PREFIX)) return undefined;
  if (tileId.startsWith(PLAN_GANTT_MILESTONE_TILE_PREFIX)) {
    return tileId.slice(PLAN_GANTT_MILESTONE_TILE_PREFIX.length);
  }
  return undefined;
}

const EMAIL_SETUP_COMPLETE_MILESTONE_IDS = new Set(["email_complete", "email_setup_complete"]);

/** Ignite Silver workstream: narrower bars for channel / journey milestones (plan Gantt unchanged). */
const IGNITE_SILVER_WORKSTREAM_NARROW_MILESTONE_IDS = new Set([
  "journeys_live",
  "email_setup_complete",
  "sms_setup_complete",
  "whatsapp_complete",
]);

/** Growth Silver workstream: narrower bars for selected milestones (plan Gantt unchanged). */
const GROWTH_SILVER_WORKSTREAM_NARROW_MILESTONE_IDS = new Set([
  "dashboard_complete",
  "dash_complete",
  "sms_setup_complete",
  "sms_complete",
  "whatsapp_complete",
]);

const IGNITE_MILESTONE_EXTRA_TIMELINE_COLUMNS = 1;

/** Quickstart Gold/Silver plan Gantt: +1 column on these section milestones. */
const QUICKSTART_GANTT_WIDER_MILESTONE_LANES = new Set<Workstream>([
  "gantt_data",
  "gantt_web_mobile",
]);

function planGanttMilestoneLaneFromTile(
  milestone: Pick<TileRecord, "Tile_ID" | "Workstream">,
): Workstream | undefined {
  if (milestone.Workstream?.startsWith("gantt_")) return milestone.Workstream;
  if (milestone.Tile_ID.startsWith(PLAN_GANTT_BLANK_MILESTONE_PREFIX)) {
    return milestone.Tile_ID.slice(PLAN_GANTT_BLANK_MILESTONE_PREFIX.length) as Workstream;
  }
  return undefined;
}

function quickstartGanttMilestoneExtraTimelineColumns(
  planOptionId: PlanOptionId,
  milestone: Pick<TileRecord, "Tile_ID" | "Workstream">,
): number {
  if (planOptionId !== "quickstart_gold" && planOptionId !== "quickstart_silver") return 0;
  const lane = planGanttMilestoneLaneFromTile(milestone);
  return lane && QUICKSTART_GANTT_WIDER_MILESTONE_LANES.has(lane) ? 1 : 0;
}

/** Default Growth Silver milestone width (8 columns per plan week). */
export const GROWTH_SILVER_MILESTONE_TIMELINE_COLUMNS = 3;
export const GROWTH_SILVER_DATA_MILESTONE_TIMELINE_COLUMNS = 5;
export const GROWTH_SILVER_GANTT_EXTRA_MILESTONE_COLUMNS = 2;

/** Growth Silver plan Gantt only: wider bars on these section milestones. */
const GROWTH_SILVER_GANTT_WIDER_MILESTONE_LANES = new Set<Workstream>([
  "gantt_admin",
  "gantt_tech",
  "gantt_email",
  "gantt_sms",
  "gantt_whatsapp",
  "gantt_messaging",
]);

function growthSilverGanttMilestoneExtraTimelineColumns(
  milestone: Pick<TileRecord, "Tile_ID" | "Workstream">,
): number {
  const lane = planGanttMilestoneLaneFromTile(milestone);
  return lane && GROWTH_SILVER_GANTT_WIDER_MILESTONE_LANES.has(lane)
    ? GROWTH_SILVER_GANTT_EXTRA_MILESTONE_COLUMNS
    : 0;
}

const GROWTH_SILVER_DATA_MILESTONE_IDS = new Set(["data_planning_complete", "data_complete"]);

export function isGrowthSilverDataMilestone(tile: Pick<TileRecord, "Tile_ID" | "Workstream">): boolean {
  const src = planGanttMilestoneSourceTileId(tile.Tile_ID);
  if (src && GROWTH_SILVER_DATA_MILESTONE_IDS.has(src)) return true;
  const base = tile.Tile_ID.includes("__") ? tile.Tile_ID.split("__").pop()! : tile.Tile_ID;
  if (GROWTH_SILVER_DATA_MILESTONE_IDS.has(base)) return true;
  if (tile.Tile_ID.includes(`${PLAN_GANTT_BLANK_MILESTONE_PREFIX}gantt_data`)) return true;
  return tile.Workstream === "data" || tile.Workstream === "gantt_data";
}

export function growthSilverMilestoneTimelineColumnSpan(
  tile: Pick<TileRecord, "Tile_ID" | "Workstream">,
): number {
  return isGrowthSilverDataMilestone(tile)
    ? GROWTH_SILVER_DATA_MILESTONE_TIMELINE_COLUMNS
    : GROWTH_SILVER_MILESTONE_TIMELINE_COLUMNS;
}

export function isTimelineMilestoneTile(
  tile: Pick<TileRecord, "Tile_ID" | "Category">,
): boolean {
  return tile.Category === "milestone" || isPlanGanttMilestoneTile(tile);
}

export function growthSilverMilestoneTimelineUnits(
  tile: Pick<TileRecord, "Tile_ID" | "Workstream">,
  startUnit: number,
  timelineColumnCount: number,
): { startUnit: number; endUnit: number } {
  const span = growthSilverMilestoneTimelineColumnSpan(tile);
  return {
    startUnit,
    endUnit: Math.min(timelineColumnCount, startUnit + span - 1),
  };
}

export function isEmailSetupCompletePlanGanttMilestone(tile: Pick<TileRecord, "Tile_ID">): boolean {
  const src = planGanttMilestoneSourceTileId(tile.Tile_ID);
  if (src && EMAIL_SETUP_COMPLETE_MILESTONE_IDS.has(src)) return true;
  const base = tile.Tile_ID.includes("__") ? tile.Tile_ID.split("__").pop()! : tile.Tile_ID;
  return EMAIL_SETUP_COMPLETE_MILESTONE_IDS.has(base);
}

function igniteMilestoneEligibleForExtraColumn(
  tile: Pick<TileRecord, "Tile_ID" | "Category" | "Workstream">,
): boolean {
  return tile.Category === "milestone" || isPlanGanttMilestoneTile(tile);
}

/** Extra Gantt / timeline columns beyond span (plan-specific layout tweaks). */
export function planGanttMilestoneExtraTimelineEndColumns(
  planOptionId: PlanOptionId,
  tile: Pick<TileRecord, "Tile_ID" | "Category" | "Workstream">,
): number {
  if (
    (planOptionId === "12_week" || planOptionId === "enterprise_gold") &&
    isEmailSetupCompletePlanGanttMilestone(tile)
  ) {
    return 1;
  }
  if (
    (planOptionId === "ignite_silver" || planOptionId === "ignite_gold") &&
    igniteMilestoneEligibleForExtraColumn(tile)
  ) {
    return IGNITE_MILESTONE_EXTRA_TIMELINE_COLUMNS;
  }
  const quickstartExtra = quickstartGanttMilestoneExtraTimelineColumns(planOptionId, tile);
  if (quickstartExtra > 0) return quickstartExtra;
  return 0;
}

/** Columns to subtract from workstream milestone `endUnit` (Ignite Silver only). */
export function igniteSilverWorkstreamMilestoneEndColumnTrim(
  tile: Pick<TileRecord, "Tile_ID" | "Category">,
): number {
  if (tile.Category !== "milestone") return 0;
  const base = tile.Tile_ID.includes("__") ? tile.Tile_ID.split("__").pop()! : tile.Tile_ID;
  return IGNITE_SILVER_WORKSTREAM_NARROW_MILESTONE_IDS.has(base) ? 1 : 0;
}

/** Columns to subtract from workstream milestone `endUnit` (Ignite Gold only). */
export function igniteGoldWorkstreamMilestoneEndColumnTrim(
  tile: Pick<TileRecord, "Category">,
): number {
  return tile.Category === "milestone" ? 1 : 0;
}

/** Columns to subtract from workstream milestone `endUnit` (Growth Silver only). */
export function growthSilverWorkstreamMilestoneEndColumnTrim(
  tile: Pick<TileRecord, "Tile_ID" | "Category">,
): number {
  if (tile.Category !== "milestone") return 0;
  const base = tile.Tile_ID.includes("__") ? tile.Tile_ID.split("__").pop()! : tile.Tile_ID;
  return GROWTH_SILVER_WORKSTREAM_NARROW_MILESTONE_IDS.has(base) ? 1 : 0;
}

export function planGanttMilestoneDrawerTitle(tile: TileRecord): string {
  if (tile.Workstream === "gantt_messaging") {
    const src = planGanttMilestoneSourceTileId(tile.Tile_ID);
    if (src === "journeys_live" || tile.Tile_ID === `${PLAN_GANTT_MILESTONE_TILE_PREFIX}journeys_live`) {
      return normalizeMilestoneTitle("Message Build");
    }
  }
  return normalizeMilestoneTitle(tile.Title);
}

/** Swimlane workstream → plan-task Gantt section lane (all ServCon plan seeds use `gantt_*`). */
const SWIMLANE_WS_TO_GANTT_LANE: Partial<Record<Workstream, Workstream>> = {
  governance: "gantt_admin",
  data: "gantt_data",
  tech: "gantt_tech",
  email: "gantt_email",
  sms: "gantt_sms",
  whatsapp: "gantt_whatsapp",
  campaign: "gantt_messaging",
};

function planGanttLaneForSwimlaneWorkstream(workstream: Workstream): Workstream | undefined {
  return SWIMLANE_WS_TO_GANTT_LANE[workstream] ?? workstream;
}

function isPlanTaskBar(tile: TileRecord): boolean {
  return tile.Category !== "milestone" && !isPlanGanttMilestoneTile(tile);
}

const MESSAGING_GANTT_LANE: Workstream = "gantt_messaging";

function planTaskKeyFromTileId(tileId: string): string {
  const base = tileId.includes("__") ? tileId.split("__").pop()! : tileId;
  return base.startsWith("ept_") ? base.slice(4) : base;
}

function isMessagingPhase1PlanTask(tile: TileRecord): boolean {
  if (tile.Workstream !== MESSAGING_GANTT_LANE || !isPlanTaskBar(tile)) return false;
  const key = planTaskKeyFromTileId(tile.Tile_ID).toLowerCase();
  return key.includes("build_priority_1") || key.includes("phase_1");
}

function isMessagingPhase2PlanTask(tile: TileRecord): boolean {
  if (tile.Workstream !== MESSAGING_GANTT_LANE || !isPlanTaskBar(tile)) return false;
  const key = planTaskKeyFromTileId(tile.Tile_ID).toLowerCase();
  return key.includes("build_priority_2") || key.includes("phase_2");
}

function isJourneysLiveSwimlaneMilestone(tile: TileRecord): boolean {
  const base = tile.Tile_ID.includes("__") ? tile.Tile_ID.split("__").pop()! : tile.Tile_ID;
  return base === "journeys_live";
}

function pickLatestEndingTask(tasks: readonly TileRecord[]): TileRecord | undefined {
  let bestEnd = -1;
  let bestStack = -1;
  let best: TileRecord | undefined;
  for (const t of tasks) {
    const end = t.Start_Week + Math.max(1, t.Span_Weeks) - 1;
    if (end > bestEnd || (end === bestEnd && t.Stack_Order > bestStack)) {
      bestEnd = end;
      bestStack = t.Stack_Order;
      best = t;
    }
  }
  return best;
}

function planTaskEndWeek(tile: TileRecord): number {
  return tile.Start_Week + Math.max(1, tile.Span_Weeks) - 1;
}

function laneHasTaskTouchingTimelineEnd(
  laneTasks: readonly TileRecord[],
  planOptionId: PlanOptionId,
): boolean {
  const maxWeek = planTabWeekCount(planOptionId);
  return laneTasks.some((t) => isPlanTaskBar(t) && planTaskEndWeek(t) >= maxWeek);
}

function milestoneAnchorCandidates(
  laneTasks: readonly TileRecord[],
  lane: Workstream,
  swimlaneMilestone: TileRecord | undefined,
  planOptionId: PlanOptionId,
): TileRecord[] {
  const bars = laneTasks.filter(isPlanTaskBar);

  if (lane === MESSAGING_GANTT_LANE) {
    const phase1 = bars.filter(isMessagingPhase1PlanTask);
    const isJourneysLive = swimlaneMilestone && isJourneysLiveSwimlaneMilestone(swimlaneMilestone);
    
    if (isJourneysLive && phase1.length) {
      return phase1;
    }

    if (laneHasTaskTouchingTimelineEnd(bars, planOptionId)) {
      return bars;
    }

    return bars.filter((t) => !isMessagingPhase2PlanTask(t));
  }

  return bars;
}

/** Among tasks touching the timeline end, pick anchor row within ±1 stack of the end-touching bar. */
function pickTimelineEndMilestoneAnchor(
  atTimelineEnd: readonly TileRecord[],
  endTouchingAnchor: TileRecord,
): TileRecord {
  const targetStack = endTouchingAnchor.Stack_Order;
  const nearby = atTimelineEnd.filter((t) => Math.abs(t.Stack_Order - targetStack) <= 1);
  return pickLatestEndingTask(nearby.length ? nearby : atTimelineEnd) ?? endTouchingAnchor;
}

function resolveLaneMilestoneAnchor(
  planTaskTiles: readonly TileRecord[],
  lane: Workstream,
  planOptionId: PlanOptionId,
  swimlaneMilestone?: TileRecord,
): { anchor: TileRecord; flushToTimelineEnd: boolean } | undefined {
  const laneTasks = planTaskTiles.filter((t) => t.Workstream === lane);
  const candidates = milestoneAnchorCandidates(laneTasks, lane, swimlaneMilestone, planOptionId);
  if (!candidates.length) return undefined;

  const maxWeek = planTabWeekCount(planOptionId);
  const atTimelineEnd = candidates.filter((t) => planTaskEndWeek(t) >= maxWeek);
  if (atTimelineEnd.length) {
    const endTouching = pickLatestEndingTask(atTimelineEnd);
    if (!endTouching) return undefined;
    return {
      anchor: pickTimelineEndMilestoneAnchor(atTimelineEnd, endTouching),
      flushToTimelineEnd: true,
    };
  }

  const anchor = pickLatestEndingTask(candidates);
  return anchor ? { anchor, flushToTimelineEnd: false } : undefined;
}

/**
 * Among tasks in a lane, the bar that ends last (after Gantt resize); ties → highest `Stack_Order`.
 * Messaging journeys milestone uses Phase 1 only unless a task reaches the plan timeline end.
 */
export function anchorPlanTaskForLaneMilestone(
  planTaskTiles: readonly TileRecord[],
  lane: Workstream,
  swimlaneMilestone?: TileRecord,
  planOptionId?: PlanOptionId,
): TileRecord | undefined {
  if (!planOptionId) {
    const laneTasks = planTaskTiles.filter((t) => t.Workstream === lane && isPlanTaskBar(t));
    if (lane === MESSAGING_GANTT_LANE) {
      const phase1 = laneTasks.filter(isMessagingPhase1PlanTask);
      if (phase1.length && swimlaneMilestone && isJourneysLiveSwimlaneMilestone(swimlaneMilestone)) {
        return pickLatestEndingTask(phase1);
      }
      const withoutPhase2 = laneTasks.filter((t) => !isMessagingPhase2PlanTask(t));
      if (withoutPhase2.length) return pickLatestEndingTask(withoutPhase2);
    }
    return pickLatestEndingTask(laneTasks);
  }
  return resolveLaneMilestoneAnchor(planTaskTiles, lane, planOptionId, swimlaneMilestone)?.anchor;
}

function milestoneStartAfterAnchor(
  anchor: TileRecord,
  planOptionId: PlanOptionId,
  spanPlanWeeks: number,
): { startWeek: number; spanWeeks: number } {
  const maxWeek = planTabWeekCount(planOptionId);
  const anchorEnd = anchor.Start_Week + Math.max(1, anchor.Span_Weeks) - 1;
  const startWeek = Math.min(maxWeek, anchorEnd + 1);
  const spanWeeks = Math.min(Math.max(1, spanPlanWeeks), Math.max(1, maxWeek - startWeek + 1));
  return { startWeek, spanWeeks };
}

function isEnterprisePlatinumOrGold(planOptionId: PlanOptionId): boolean {
  return planOptionId === "12_week" || planOptionId === "enterprise_gold";
}

function planGanttMilestoneSpanWeeks(planOptionId: PlanOptionId): number {
  return isEnterprisePlatinumOrGold(planOptionId) ? 2 : 1;
}

/** +1 plan week on Enterprise Platinum/Gold Gantt for these section milestones. */
const ENTERPRISE_PLAT_GOLD_GANTT_EXTENDED_MILESTONE_LANES = new Set<Workstream>([
  "gantt_admin",
  "gantt_data",
  "gantt_tech",
  "gantt_messaging",
  "gantt_whatsapp",
  "gantt_web_mobile",
]);

function enterprisePlatGoldGanttMilestoneLane(
  milestone: Pick<TileRecord, "Tile_ID" | "Workstream">,
): Workstream | undefined {
  const lane = planGanttMilestoneLaneFromTile(milestone);
  if (lane && ENTERPRISE_PLAT_GOLD_GANTT_EXTENDED_MILESTONE_LANES.has(lane)) return lane;
  return undefined;
}

function enterprisePlatGoldGanttMilestoneExtraPlanWeeks(
  milestone: Pick<TileRecord, "Tile_ID" | "Workstream">,
): number {
  return enterprisePlatGoldGanttMilestoneLane(milestone) ? 1 : 0;
}

function planGanttMilestoneDesiredSpanPlanWeeks(
  planOptionId: PlanOptionId,
  milestone: Pick<TileRecord, "Tile_ID" | "Workstream">,
): number {
  const base = planGanttMilestoneSpanWeeks(planOptionId);
  if (!isEnterprisePlatinumOrGold(planOptionId)) return base;
  return base + enterprisePlatGoldGanttMilestoneExtraPlanWeeks(milestone);
}

/** Milestone bar width in timeline columns for plan-task Gantt. */
export function planGanttMilestoneColumnSpan(
  planOptionId: PlanOptionId,
  milestone: Pick<TileRecord, "Tile_ID" | "Category" | "Workstream">,
): number {
  if (planOptionId === "growth_silver") {
    return (
      growthSilverMilestoneTimelineColumnSpan(milestone) +
      growthSilverGanttMilestoneExtraTimelineColumns(milestone)
    );
  }
  const spanWeeks = planGanttMilestoneDesiredSpanPlanWeeks(planOptionId, milestone);
  const units = planWeekRangeToTimelineUnits(planOptionId, 1, spanWeeks);
  const extra = planGanttMilestoneExtraTimelineEndColumns(planOptionId, milestone);
  return units.endUnit - units.startUnit + 1 + extra;
}

/**
 * Column-accurate milestone placement from anchor task timeline units (all plan Gantt plans).
 * Flush mode: milestone right edge matches anchor right edge; otherwise starts after anchor.
 */
export function planGanttMilestoneTimelineUnitsFromAnchor(
  planOptionId: PlanOptionId,
  milestone: Pick<TileRecord, "Tile_ID" | "Category" | "Workstream">,
  flushAlignEndToAnchor: boolean,
  anchorUnits: { startUnit: number; endUnit: number },
): { startUnit: number; endUnit: number } {
  const total = planGanttTimelineColumnCount(planOptionId);
  const spanCols = Math.max(1, planGanttMilestoneColumnSpan(planOptionId, milestone));
  const alignEndToAnchor =
    flushAlignEndToAnchor || anchorUnits.endUnit >= total;

  if (alignEndToAnchor) {
    const endUnit = Math.min(total, anchorUnits.endUnit);
    const startUnit = Math.max(1, endUnit - spanCols + 1);
    return { startUnit, endUnit };
  }

  const startUnit = Math.min(total, anchorUnits.endUnit + 1);
  const endUnit = Math.min(total, startUnit + spanCols - 1);
  return { startUnit, endUnit };
}

function findPlanGanttAnchorTask(
  anchorTileId: string,
  planTaskTiles: readonly TileRecord[],
): TileRecord | undefined {
  const id = anchorTileId.trim();
  if (!id) return undefined;
  return planTaskTiles.find((t) => t.Tile_ID === id);
}

export function resolvePlanGanttMilestoneTimelineUnits(
  planOptionId: PlanOptionId,
  milestone: TileRecord,
  planTaskTiles: readonly TileRecord[],
  getAnchorUnits: (anchor: TileRecord) => { startUnit: number; endUnit: number },
): { startUnit: number; endUnit: number } | undefined {
  if (!isPlanGanttMilestoneTile(milestone)) return undefined;
  const anchorId = (milestone.Related_Tasks ?? "").trim();
  const anchor = findPlanGanttAnchorTask(anchorId, planTaskTiles);
  if (!anchor) return undefined;
  const anchorUnits = getAnchorUnits(anchor);
  return planGanttMilestoneTimelineUnitsFromAnchor(
    planOptionId,
    milestone,
    milestone.planGanttMilestoneFlushEnd === true,
    anchorUnits,
  );
}

function milestoneWeeksFromAnchor(
  anchor: TileRecord,
  planOptionId: PlanOptionId,
  flushToTimelineEnd: boolean,
  milestone: Pick<TileRecord, "Tile_ID" | "Workstream">,
): { startWeek: number; spanWeeks: number } {
  const desiredSpan = planGanttMilestoneDesiredSpanPlanWeeks(planOptionId, milestone);
  const maxWeek = planTabWeekCount(planOptionId);
  if (flushToTimelineEnd) {
    const spanWeeks = Math.min(Math.max(1, desiredSpan), maxWeek);
    const startWeek = Math.max(1, maxWeek - spanWeeks + 1);
    return { startWeek, spanWeeks };
  }
  return milestoneStartAfterAnchor(anchor, planOptionId, desiredSpan);
}

function cloneMilestoneForPlanGantt(
  source: TileRecord,
  lane: Workstream,
  planOptionId: PlanOptionId,
  anchor: TileRecord,
  flushToTimelineEnd: boolean,
): TileRecord {
  const baseId = source.Tile_ID.replace(/^.*__/, "").split("__").pop() ?? source.Tile_ID;
  const tileId = `${PLAN_GANTT_MILESTONE_TILE_PREFIX}${baseId}`;
  const milestoneMeta = { Tile_ID: tileId, Workstream: lane };
  const { startWeek, spanWeeks } = milestoneWeeksFromAnchor(
    anchor,
    planOptionId,
    flushToTimelineEnd,
    milestoneMeta,
  );
  return {
    ...source,
    Tile_ID: tileId,
    Workstream: lane,
    Category: "milestone",
    Start_Week: startWeek,
    Span_Weeks: spanWeeks,
    Stack_Order: anchor.Stack_Order,
    [PLAN_GANTT_MILESTONE_ANCHOR_FIELD]: anchor.Tile_ID,
    planGanttMilestoneFlushEnd: flushToTimelineEnd,
    Title: normalizeMilestoneTitle(source.Title),
  };
}

function blankPlaceholderMilestone(
  lane: EnterprisePlatinumGanttLaneId,
  anchor: TileRecord,
  planOptionId: PlanOptionId,
  configId: string,
  flushToTimelineEnd: boolean,
): TileRecord {
  const label = platinumGanttSectionLabelForLane(lane);
  const milestoneMeta = {
    Tile_ID: `${PLAN_GANTT_BLANK_MILESTONE_PREFIX}${lane}`,
    Workstream: lane,
  };
  const { startWeek, spanWeeks } = milestoneWeeksFromAnchor(
    anchor,
    planOptionId,
    flushToTimelineEnd,
    milestoneMeta,
  );
  return {
    Config_ID: configId,
    Tile_ID: `${PLAN_GANTT_BLANK_MILESTONE_PREFIX}${lane}`,
    Workstream: lane,
    Title: normalizeMilestoneTitle(label),
    Start_Week: startWeek,
    Span_Weeks: spanWeeks,
    Stack_Order: anchor.Stack_Order,
    Row_Span: 1,
    Category: "milestone",
    Notes: "",
    Description: "",
    Attendees: "",
    Agenda_Outcomes: "",
    [PLAN_GANTT_MILESTONE_ANCHOR_FIELD]: anchor.Tile_ID,
    planGanttMilestoneFlushEnd: flushToTimelineEnd,
    Level_Of_Effort: "",
  };
}

function uniqueLaneOrder(planTaskTiles: readonly TileRecord[]): Workstream[] {
  const seen = new Set<Workstream>();
  const out: Workstream[] = [];
  for (const t of planTaskTiles) {
    if (!seen.has(t.Workstream)) {
      seen.add(t.Workstream);
      out.push(t.Workstream);
    }
  }
  return out;
}

/**
 * Swimlane project milestones for plan-task Gantt rows (synthetic tiles, not persisted).
 */
export function buildPlanGanttMilestoneTiles(
  planOptionId: PlanOptionId,
  swimlaneTiles: readonly TileRecord[],
  channels: ChannelPreferences,
  planTaskTiles: readonly TileRecord[],
  configId: string,
): TileRecord[] {
  if (!usesPlanTaskGantt(planOptionId)) return [];

  const out: TileRecord[] = [];
  const lanesWithMilestone = new Set<Workstream>();

  for (const m of swimlaneTiles) {
    if (m.Category !== "milestone") continue;
    if (!isWorkstreamVisibleForChannels(m.Workstream, channels)) continue;
    const lane = planGanttLaneForSwimlaneWorkstream(m.Workstream);
    if (!lane) continue;
    const resolved = resolveLaneMilestoneAnchor(planTaskTiles, lane, planOptionId, m);
    if (!resolved) continue;
    const { anchor, flushToTimelineEnd } = resolved;
    out.push(cloneMilestoneForPlanGantt(m, lane, planOptionId, anchor, flushToTimelineEnd));
    lanesWithMilestone.add(lane);
  }

  for (const laneId of uniqueLaneOrder(planTaskTiles)) {
    if (lanesWithMilestone.has(laneId)) continue;
    const resolved = resolveLaneMilestoneAnchor(planTaskTiles, laneId, planOptionId);
    if (!resolved) continue;
    const { anchor, flushToTimelineEnd } = resolved;
    const isGanttSectionLane = String(laneId).startsWith("gantt_");
    if (!isGanttSectionLane) continue;
    out.push(
      blankPlaceholderMilestone(
        laneId as EnterprisePlatinumGanttLaneId,
        anchor,
        planOptionId,
        configId,
        flushToTimelineEnd,
      ),
    );
  }

  return out;
}

/**
 * When Messaging has Phase 1 + Phase 2 plan tasks, Phase 2 starts the week after Phase 1 ends
 * (second Gantt row; milestone stays on the Phase 1 row).
 */
export function applyMessagingPhaseGanttLayout(
  planOptionId: PlanOptionId,
  planTaskTiles: readonly TileRecord[],
  _milestoneTiles: readonly TileRecord[],
): TileRecord[] {
  const phase2 = planTaskTiles.filter(isMessagingPhase2PlanTask);
  if (!phase2.length) return [...planTaskTiles];

  const p1 = pickLatestEndingTask(planTaskTiles.filter(isMessagingPhase1PlanTask));
  if (!p1) return [...planTaskTiles];

  const maxWeek = planTabWeekCount(planOptionId);
  const phase2Start = Math.min(maxWeek, p1.Start_Week + Math.max(1, p1.Span_Weeks));

  return planTaskTiles.map((t) => {
    if (!isMessagingPhase2PlanTask(t)) return t;
    const span = Math.max(1, t.Span_Weeks);
    const start = Math.min(phase2Start, maxWeek);
    const clampedSpan = Math.min(span, Math.max(1, maxWeek - start + 1));
    return { ...t, Start_Week: start, Span_Weeks: clampedSpan };
  });
}

function messagingLaneRowOrder(tile: TileRecord): number {
  if (isMessagingPhase1PlanTask(tile)) return 0;
  if (isMessagingPhase2PlanTask(tile)) return 1;
  return 2;
}

function sortPlanTasksForMessagingLane(a: TileRecord, b: TileRecord): number {
  const oa = messagingLaneRowOrder(a);
  const ob = messagingLaneRowOrder(b);
  if (oa !== ob) return oa - ob;
  return sortPlanTasksForRow(a, b);
}

function sortPlanTasksForRow(a: TileRecord, b: TileRecord): number {
  if (a.Stack_Order !== b.Stack_Order) return a.Stack_Order - b.Stack_Order;
  if (a.Start_Week !== b.Start_Week) return a.Start_Week - b.Start_Week;
  return a.Title.localeCompare(b.Title);
}

/**
 * One row per plan task; milestones attach to the anchor task row (`Related_Tasks`).
 */
export function buildGanttPlanTaskRows(
  tiles: readonly TileRecord[],
  laneOrder: readonly Workstream[],
): TileRecord[][] {
  const order =
    laneOrder.length > 0 ? laneOrder : [...new Set(tiles.map((t) => t.Workstream))];
  const out: TileRecord[][] = [];

  for (const laneId of order) {
    const laneTiles = tiles.filter((t) => t.Workstream === laneId);
    if (!laneTiles.length) continue;

    const milestones = laneTiles.filter((t) => t.Category === "milestone");
    const sortFn = laneId === MESSAGING_GANTT_LANE ? sortPlanTasksForMessagingLane : sortPlanTasksForRow;
    const tasks = laneTiles.filter((t) => t.Category !== "milestone").sort(sortFn);

    for (const task of tasks) {
      const row: TileRecord[] = [task];
      for (const m of milestones) {
        const anchorId = (m.Related_Tasks ?? "").trim();
        if (anchorId && anchorId === task.Tile_ID) row.push(m);
      }
      out.push(row);
    }

    for (const m of milestones) {
      const attached = out.some((row) => row.includes(m));
      if (attached) continue;
      const laneRows = out.filter((row) => row[0]?.Workstream === laneId);
      const fallback = laneRows[laneRows.length - 1];
      if (fallback) fallback.push(m);
      else out.push([m]);
    }
  }

  return out;
}
