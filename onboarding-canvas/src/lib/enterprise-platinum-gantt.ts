import seedJson from "@/lib/enterprise-platinum-gantt-seed.json";
import planSeedsJson from "@/lib/plan-gantt-seeds.json";
import { applyWeekMarkLayoutToSeedRow, type PlatinumWeekMarks } from "@/lib/enterprise-platinum-gantt-week-marks";
import { WORKSTREAMS } from "@/lib/constants";
import { ENTERPRISE_PLATINUM_TASK_SECTIONS } from "@/lib/enterprise-platinum-task-list";
import { textColorOnTileBackground, mixHexColors } from "@/lib/tile-category-colors";
import { interpolateHex, BRAZE_WORKSTREAM_RAIL_PALETTE } from "@/lib/workstream-gradient";
import type {
  ConfigRecord,
  GanttTaskRecord,
  PlanOptionId,
  TileRecord,
  Workstream,
  WorkstreamLabelTextType,
} from "@/lib/types";

/** Sections with no matching swimlane workstream label — dark rail, default white labels. */
export const PLATINUM_GANTT_UNMATCHED_SECTION_RAIL = "#300266";

/** Synthetic Gantt lane ids (one per Enterprise Platinum task-list section). */
export const ENTERPRISE_PLATINUM_GANTT_LANE_IDS = [
  "gantt_admin",
  "gantt_data",
  "gantt_tech",
  "gantt_audiences",
  "gantt_channels",
  "gantt_email",
  "gantt_sms",
  "gantt_whatsapp",
  "gantt_web_mobile",
  "gantt_messaging",
  "gantt_analytics",
] as const;

export type EnterprisePlatinumGanttLaneId = (typeof ENTERPRISE_PLATINUM_GANTT_LANE_IDS)[number];

const SECTION_TO_LANE: Record<string, EnterprisePlatinumGanttLaneId> = {
  "Project Management & Governance": "gantt_admin",
  "Administer/Platform Governance": "gantt_admin",
  Data: "gantt_data",
  Technical: "gantt_tech",
  Audiences: "gantt_audiences",
  Channels: "gantt_channels",
  Email: "gantt_email",
  SMS: "gantt_sms",
  WhatsApp: "gantt_whatsapp",
  "Web/Mobile Channels": "gantt_web_mobile",
  "Message Build": "gantt_messaging",
  Messaging: "gantt_messaging",
  Analytics: "gantt_analytics",
};

const LANE_TO_CANONICAL_SECTION: Record<EnterprisePlatinumGanttLaneId, string> = {
  gantt_admin: "Project Management & Governance",
  gantt_data: "Data",
  gantt_tech: "Technical",
  gantt_audiences: "Audiences",
  gantt_channels: "Channels",
  gantt_email: "Email",
  gantt_sms: "SMS",
  gantt_whatsapp: "WhatsApp",
  gantt_web_mobile: "Web/Mobile Channels",
  gantt_messaging: "Messaging",
  gantt_analytics: "Analytics",
};

/** Map Platinum task-list section display name → Braze Core swimlane workstream label. */
const SECTION_TO_WORKSTREAM_LABEL: Record<string, string> = {
  "Project Management & Governance": "Project Management & Governance",
  Data: "Data",
  Technical: "Technical Integration",
  Email: "Email",
  SMS: "SMS",
  WhatsApp: "WhatsApp",
  Messaging: "Campaign Build",
  "Message Build": "Campaign Build",
};

/**
 * Gantt-only sections: blend along the default brand rail ramp (same stops as swimlane gradient).
 * `t` is how far from `fromIdx` → `toIdx` (1 = same as the lower neighbor workstream).
 */
const SECTION_PALETTE_BLEND: Record<string, { fromIdx: number; toIdx: number; t: number }> = {
  /** Between Technical (#C85EB5) and Email (#91186E) — lean wine/burgundy, not bright magenta. */
  Audiences: { fromIdx: 2, toIdx: 3, t: 0.76 },
  /** Between WhatsApp and Campaign Build — nearly Message Build violet (not a dark WhatsApp clone). */
  "Web/Mobile Channels": { fromIdx: 5, toIdx: 6, t: 0.88 },
};

function blendPaletteRailColor(fromIdx: number, toIdx: number, t: number): string | undefined {
  const from = BRAZE_WORKSTREAM_RAIL_PALETTE[fromIdx];
  const to = BRAZE_WORKSTREAM_RAIL_PALETTE[toIdx];
  if (!from || !to) return undefined;
  return interpolateHex(from, to, t);
}

function workstreamHexByLabel(label: string): string | undefined {
  return WORKSTREAMS.find((w) => w.label === label)?.color;
}

export function platinumGanttSectionDisplayLabel(section: string): string {
  if (section === "Administer/Platform Governance") return "Project Management & Governance";
  if (section === "Message Build") return "Messaging";
  return section;
}

export function platinumGanttSectionRailColor(section: string): string {
  const display = platinumGanttSectionDisplayLabel(section);
  const blend = SECTION_PALETTE_BLEND[display];
  if (blend) {
    const hex = blendPaletteRailColor(blend.fromIdx, blend.toIdx, blend.t);
    if (hex) return hex;
  }
  const wsLabel = SECTION_TO_WORKSTREAM_LABEL[display];
  if (wsLabel) {
    const hex = workstreamHexByLabel(wsLabel);
    if (hex) {
      if (display === "Messaging" || display === "Message Build") {
        return mixHexColors(hex, "#ffffff", 0.16);
      }
      return hex;
    }
  }
  return PLATINUM_GANTT_UNMATCHED_SECTION_RAIL;
}

export function platinumGanttLaneRailColor(laneId: EnterprisePlatinumGanttLaneId): string {
  return platinumGanttSectionRailColor(LANE_TO_CANONICAL_SECTION[laneId]);
}

export function isPlatinumGanttUnmatchedRailColor(hex: string): boolean {
  return hex.toLowerCase() === PLATINUM_GANTT_UNMATCHED_SECTION_RAIL.toLowerCase();
}

export function defaultPlatinumGanttLaneLabelType(
  laneId: EnterprisePlatinumGanttLaneId,
  railHex: string,
): WorkstreamLabelTextType {
  if (laneId === "gantt_admin" || isPlatinumGanttUnmatchedRailColor(railHex)) return "w";
  return textColorOnTileBackground(railHex) === "#ffffff" ? "w" : "b";
}

export type EnterprisePlatinumGanttSeedRow = {
  taskKey: string;
  taskName: string;
  section: string;
  workstream: EnterprisePlatinumGanttLaneId;
  optional: string;
  description: string;
  requiredStakeholders: string;
  desiredOutcomes: string;
  resources: string;
  levelOfEffort: string;
  startWeek: number;
  spanWeeks: number;
  minSpanWeeks: number;
  weekMarks?: PlatinumWeekMarks;
};

export const ENTERPRISE_PLATINUM_GANTT_SEED: EnterprisePlatinumGanttSeedRow[] =
  seedJson as unknown as EnterprisePlatinumGanttSeedRow[];

type PlanGanttSeedPack = {
  timelineWeeks: number;
  rows: EnterprisePlatinumGanttSeedRow[];
};

const PLAN_GANTT_SEEDS_BY_PLAN = planSeedsJson as unknown as Record<PlanOptionId, PlanGanttSeedPack>;

/** Braze Core plan-option ids that use ServCon plan-task Gantt (Excel plan tabs, not Meetings). */
export const PLAN_TASK_GANTT_PLAN_IDS: readonly PlanOptionId[] = [
  "12_week",
  "enterprise_gold",
  "ignite_gold",
  "ignite_silver",
  "quickstart_gold",
  "quickstart_silver",
  "growth_silver",
] as const;

export function usesPlanTaskGantt(planOptionId: PlanOptionId): boolean {
  return (PLAN_TASK_GANTT_PLAN_IDS as readonly string[]).includes(planOptionId);
}

export function getGanttSeedForPlan(planOptionId: PlanOptionId): EnterprisePlatinumGanttSeedRow[] {
  if (planOptionId === "12_week") {
    return ENTERPRISE_PLATINUM_GANTT_SEED;
  }
  return PLAN_GANTT_SEEDS_BY_PLAN[planOptionId]?.rows ?? [];
}

/** Week-column count from the plan tab (Excel plan weeks). Undefined for Enterprise Platinum/Gold → use 56-column swimlane grid. */
export function planTaskGanttTimelineWeeks(planOptionId: PlanOptionId): number | undefined {
  if (planOptionId === "12_week" || planOptionId === "enterprise_gold") {
    return undefined;
  }
  return PLAN_GANTT_SEEDS_BY_PLAN[planOptionId]?.timelineWeeks;
}

export function isEnterprisePlatinumPlanGantt(planOptionId: ConfigRecord["planOptionId"]): boolean {
  return usesPlanTaskGantt(planOptionId);
}

export function enterprisePlatinumGanttTileId(taskKey: string): string {
  return `ept_${taskKey}`;
}

export function isEnterprisePlatinumGanttTile(tile: Pick<TileRecord, "Tile_ID">): boolean {
  return tile.Tile_ID.startsWith("ept_");
}

export function ganttLaneForSection(section: string): EnterprisePlatinumGanttLaneId {
  const mapped = SECTION_TO_LANE[section];
  if (mapped) return mapped;
  const normalized = platinumGanttSectionDisplayLabel(section);
  return SECTION_TO_LANE[normalized] ?? "gantt_analytics";
}

function compositeGanttTaskRowId(configId: string, taskKey: string): string {
  return `${configId}__${enterprisePlatinumGanttTileId(taskKey)}`;
}

export function platinumGanttSectionLabelForLane(laneId: EnterprisePlatinumGanttLaneId): string {
  return platinumGanttSectionDisplayLabel(LANE_TO_CANONICAL_SECTION[laneId]);
}

export function buildEnterprisePlatinumGanttLaneLegendFromOrder(
  orderedLaneIds: readonly Workstream[],
  colorForLane: (laneId: Workstream) => string,
): Array<{ id: Workstream; label: string; color: string }> {
  const allowed = new Set<Workstream>(ENTERPRISE_PLATINUM_GANTT_LANE_IDS);
  return orderedLaneIds
    .filter((id) => allowed.has(id))
    .map((id) => ({
      id,
      label: platinumGanttSectionLabelForLane(id as EnterprisePlatinumGanttLaneId),
      color: colorForLane(id),
    }));
}

export function buildEnterprisePlatinumGanttLaneLegend(_config: ConfigRecord): Array<{
  id: Workstream;
  label: string;
  color: string;
}> {
  const ids = [...ENTERPRISE_PLATINUM_GANTT_LANE_IDS] as Workstream[];
  return buildEnterprisePlatinumGanttLaneLegendFromOrder(ids, (id) =>
    platinumGanttLaneRailColor(id as EnterprisePlatinumGanttLaneId),
  );
}

export function mongoDocFromGanttSeed(
  configId: string,
  row: EnterprisePlatinumGanttSeedRow,
  stackOrder: number,
): Record<string, unknown> {
  const layoutRow = applyWeekMarkLayoutToSeedRow(row);
  const tileId = enterprisePlatinumGanttTileId(layoutRow.taskKey);
  return {
    ID: compositeGanttTaskRowId(configId, layoutRow.taskKey),
    Config_ID: configId,
    Task_Key: layoutRow.taskKey,
    Tile_ID: tileId,
    Section: layoutRow.section,
    Workstream: layoutRow.workstream,
    Title: layoutRow.taskName,
    Optional: layoutRow.optional === "Y" ? "Y" : "N",
    Start_Week: layoutRow.startWeek,
    Span_Weeks: layoutRow.spanWeeks,
    Min_Span_Weeks: layoutRow.minSpanWeeks,
    Stack_Order: stackOrder,
    Description: layoutRow.description,
    Attendees: layoutRow.requiredStakeholders,
    Agenda_Outcomes: layoutRow.desiredOutcomes,
    Related_Tasks: layoutRow.resources,
    Level_Of_Effort: layoutRow.levelOfEffort,
    Notes: "",
  };
}

export function ganttTaskToTileRecord(task: GanttTaskRecord): TileRecord {
  return {
    Tile_ID: task.Tile_ID,
    Config_ID: task.Config_ID,
    Workstream: task.Workstream,
    Title: task.Title,
    Start_Week: task.Start_Week,
    Span_Weeks: task.Span_Weeks,
    Stack_Order: task.Stack_Order,
    Row_Span: 1,
    Category: "customer_activity",
    Notes: task.Notes ?? "",
    Description: task.Description ?? "",
    Attendees: task.Attendees ?? "",
    Agenda_Outcomes: task.Agenda_Outcomes ?? "",
    Related_Tasks: task.Related_Tasks ?? "",
    Level_Of_Effort: task.Level_Of_Effort ?? "",
    CaboodlePatchKey: task.CaboodlePatchKey,
    ganttMinSpanWeeks: task.Min_Span_Weeks,
    ganttOptional: task.Optional,
  };
}
