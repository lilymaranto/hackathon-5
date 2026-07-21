import {
  ChannelPreferences,
  ConfigRecord,
  IndustryType,
  PlanDurationWeeks,
  PlanOptionId,
  ProductType,
  TileRecord,
  Workstream,
} from "@/lib/types";

/** AI Decisioning Studio timeline: one grid column per week (W1–W16). */
export const AI_DECISIONING_STUDIO_TIMELINE_WEEKS = 16 as PlanDurationWeeks;

/** Fixed swimlane keys for the AI Decisioning canvas (paste tiles with these `Workstream` values). */
export const ADS_CANVAS_LANE_IDS = ["one", "two", "three", "four"] as const satisfies readonly Workstream[];

/** Gantt / legend row hues for ADS lanes (left rail + workstream color for session borders). */
export const AI_DECISIONING_GANTT_LANE_LEGEND: ReadonlyArray<{
  id: (typeof ADS_CANVAS_LANE_IDS)[number];
  label: string;
  color: string;
}> = [
  { id: "one", label: "Lane 1", color: "#91186E" },
  { id: "two", label: "Lane 2", color: "#801ED7" },
  { id: "three", label: "Lane 3", color: "#861CB4" },
  { id: "four", label: "Lane 4", color: "#300266" },
];

/** Same order as the Channels fieldset (first checked wins for marketing-assets copy). */
const ADS_CHANNEL_PICK_ORDER: (keyof ChannelPreferences)[] = [
  "email",
  "sms",
  "whatsapp",
  "inProductMessaging",
];

function countSelectedChannels(channels: ChannelPreferences): number {
  return ADS_CHANNEL_PICK_ORDER.filter((k) => channels[k]).length;
}

function firstSelectedChannel(channels: ChannelPreferences): keyof ChannelPreferences | null {
  for (const key of ADS_CHANNEL_PICK_ORDER) {
    if (channels[key]) return key;
  }
  return null;
}

function channelExampleWordForMarketingAssets(key: keyof ChannelPreferences): string {
  switch (key) {
    case "email":
      return "email";
    case "sms":
      return "SMS";
    case "whatsapp":
      return "WhatsApp";
    case "inProductMessaging":
      return "in-product messaging";
    default:
      return "email";
  }
}

/**
 * AI Decisioning Studio chevron labels that depend on config channel checkboxes.
 * Falls back to {@link TileRecord.Title} for all other tiles.
 */
export function adsChevronDisplayTitle(
  tile: Pick<TileRecord, "Tile_ID" | "Title">,
  channels: ChannelPreferences,
): string {
  if (tile.Tile_ID === "ads_lane2_marketing_assets") {
    const first = firstSelectedChannel(channels);
    const word = first ? channelExampleWordForMarketingAssets(first) : "email";
    return `Set up marketing assets (e.g., ${word} templates)`;
  }
  if (tile.Tile_ID === "ads_lane3_activation_channels") {
    const n = countSelectedChannels(channels);
    const noun = n > 1 ? "channels" : "channel";
    return `Integrate with activation ${noun}`;
  }
  return tile.Title;
}

/** Role labels listed under Suggested Attendees for AI Decisioning Studio tile drawer (details live in the on-page roles chart). */
export type AiDecisioningStudioTeamRow = {
  role: string;
};

export const AI_DECISIONING_STUDIO_TEAM_ROWS: AiDecisioningStudioTeamRow[] = [
  { role: "Use case champion" },
  { role: "Project coordinator" },
  { role: "Marketing manager" },
  { role: "Activation platform SME" },
  { role: "Data engineer" },
  { role: "Analyst" },
];
export {
  getAiDecisioningStudioSeedTemplate,
  getSeedTemplate,
  getTimelineConfig,
  isEnterprisePlatinumGridPlan,
  ENTERPRISE_PLATINUM_COLUMNS_PER_MONTH,
  ENTERPRISE_PLATINUM_MONTH_COUNT,
  ENTERPRISE_PLATINUM_TIMELINE_COLUMNS,
  IGNITE_GOLD_COLUMNS_PER_MONTH,
  IGNITE_SILVER_COLUMNS_PER_MONTH,
  IGNITE_SILVER_MONTH_COUNT,
  IGNITE_SILVER_TIMELINE_COLUMNS,
  QUICKSTART_GOLD_COLUMNS_PER_MONTH,
  QUICKSTART_GOLD_MONTH_COUNT,
  QUICKSTART_GOLD_TIMELINE_COLUMNS,
  TIMELINE_CONFIGS,
} from "@/lib/templates";

export {
  ENTERPRISE_PLATINUM_TASKS,
  ENTERPRISE_PLATINUM_TASK_SECTIONS,
  enterprisePlatinumTasksBySection,
  type EnterprisePlatinumTaskRow,
} from "@/lib/enterprise-platinum-task-list";

/** Growth Silver: grid columns per plan week (swimlane / Gantt). */
export const GROWTH_SILVER_COLUMNS_PER_WEEK = 8;

export {
  defaultTileLibraryEntry,
  getTileLibraryEntry,
  TILE_LIBRARY,
  tileLibraryKey,
} from "@/lib/tile-library";

/** Whether a swimlane row is shown for configs that scope channels (email / SMS / WhatsApp). */
export function isWorkstreamVisibleForChannels(
  workstreamId: Workstream,
  channels: ChannelPreferences,
): boolean {
  if (
    workstreamId === "one" ||
    workstreamId === "two" ||
    workstreamId === "three" ||
    workstreamId === "four"
  ) {
    return true;
  }
  if (workstreamId === "email") return channels.email;
  if (workstreamId === "sms") return channels.sms;
  if (workstreamId === "whatsapp") return channels.whatsapp;
  return true;
}

export const WORKSTREAMS: Array<{ id: Workstream; label: string; color: string }> =
  [
    { id: "governance", label: "Project Management & Governance", color: "#FFA524" },
    { id: "data", label: "Data", color: "#FFA4FB" },
    { id: "tech", label: "Technical Integration", color: "#C85EB5" },
    { id: "email", label: "Email", color: "#91186E" },
    { id: "sms", label: "SMS", color: "#8B1A91" },
    { id: "whatsapp", label: "WhatsApp", color: "#861CB4" },
    { id: "campaign", label: "Campaign Build", color: "#801ED7" },
    { id: "enablement", label: "Enablement", color: "#300266" },
  ];

/** UI labels for onboarding plan timelines. */
export const PLAN_OPTIONS: ReadonlyArray<{
  id: PlanOptionId;
  label: string;
  durationWeeks: PlanDurationWeeks;
}> = [
  { id: "12_week", label: "Enterprise Platinum", durationWeeks: 48 },
  { id: "enterprise_gold", label: "Enterprise Gold", durationWeeks: 48 },
  { id: "ignite_gold", label: "Ignite Gold", durationWeeks: 20 },
  { id: "ignite_silver", label: "Ignite Silver", durationWeeks: 40 },
  { id: "quickstart_gold", label: "Quickstart Gold", durationWeeks: 24 },
  { id: "quickstart_silver", label: "Quickstart Silver", durationWeeks: 24 },
  { id: "growth_silver", label: "Growth Silver", durationWeeks: 6 },
  {
    id: "ai_decisioning_studio",
    label: "AI Decisioning Studio",
    durationWeeks: 16,
  },
];

const PLAN_OPTION_ID_SET = new Set<string>(PLAN_OPTIONS.map((o) => o.id));

/** Braze Core timeline packages only (create/edit picker). AI Decisioning uses a fixed plan slug. */
export const BRAZE_CORE_PLAN_OPTIONS = PLAN_OPTIONS.filter((o) => o.id !== "ai_decisioning_studio");

export function durationWeeksForPlanOption(id: PlanOptionId): PlanDurationWeeks {
  const row = PLAN_OPTIONS.find((o) => o.id === id);
  return row?.durationWeeks ?? 12;
}

export function labelForPlanOption(id: PlanOptionId): string {
  return PLAN_OPTIONS.find((o) => o.id === id)?.label ?? "Enterprise Platinum";
}

export function parsePlanOptionId(raw: unknown): PlanOptionId | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  if (PLAN_OPTION_ID_SET.has(s)) return s as PlanOptionId;
  const slugish = s.toLowerCase().replace(/\s+/g, "_");
  if (PLAN_OPTION_ID_SET.has(slugish)) return slugish as PlanOptionId;
  const byLabel = PLAN_OPTIONS.find((o) => o.label.toLowerCase() === s.toLowerCase());
  if (byLabel) return byLabel.id;
  const legacy12 = s.toLowerCase().replace(/\s+/g, " ").trim();
  if (legacy12 === "12 week" || legacy12 === "12-week") return "12_week";
  return null;
}

/**
 * Legacy configs without **Plan_Option** — infer from stored week count.
 * **Quickstart Gold** and **Quickstart Silver** use **24** weeks in `PLAN_OPTIONS` (8×3 month canvas). **18** still maps to Quickstart Gold for older Caboodle rows.
 * **24**-week rows without a plan slug infer **Quickstart Gold**; set **Plan_Option** to `quickstart_silver` for Silver.
 * 18-week rows without a plan slug cannot distinguish Ignite vs Quickstart Gold; default Quickstart
 * so timeline behavior matches the historical combined Gold seed (`dash_complete` week 4).
 * **Ignite Gold** configs should always persist **Plan_Option** / **Plan Option** on the sheet.
 */
export function inferPlanOptionIdFromWeeks(weeks: PlanDurationWeeks): PlanOptionId {
  if (weeks === 48) return "12_week";
  if (weeks === 12 || weeks === 16) return "12_week";
  if (weeks === 6) return "growth_silver";
  if (weeks === 40) return "ignite_silver";
  if (weeks === 20) return "ignite_gold";
  if (weeks === 24 || weeks === 18) return "quickstart_gold";
  return "12_week";
}

/** Caboodle / sheet columns that may hold a plan slug or label (`ignite_silver`, `Quickstart Gold`, …). */
function planOptionRecordCandidates(record: Record<string, unknown>): unknown[] {
  return [
    record.Plan,
    record["Plan"],
    record.Plan_Option,
    record.plan_option,
    record["Plan_Option"],
    record["Plan Option"],
    record["plan option"],
    record.PlanOption,
    record.planOption,
    record["planOption"],
    record.PLAN_OPTION,
    record.Onboarding_Plan,
    record["Onboarding Plan"],
  ];
}

/**
 * Returns a plan id only when the row has an explicit slug/label in **Plan** (or legacy Plan_Option).
 * Does **not** infer from week count — use with {@link inferPlanOptionIdFromWeeks} for legacy rows.
 */
export function parseExplicitPlanOptionFromRecord(record: Record<string, unknown>): PlanOptionId | null {
  for (const raw of planOptionRecordCandidates(record)) {
    const parsed = parsePlanOptionId(raw);
    if (parsed) return parsed;
  }
  return null;
}

export function resolvePlanOptionId(
  record: Record<string, unknown>,
  durationWeeks: PlanDurationWeeks,
): PlanOptionId {
  return parseExplicitPlanOptionFromRecord(record) ?? inferPlanOptionIdFromWeeks(durationWeeks);
}

export function formatConfigPlanHeading(
  config: Pick<ConfigRecord, "Title" | "chosenTitle" | "Product_Type" | "planOptionId">,
): string {
  const title = (config.chosenTitle ?? "").trim() || config.Title;
  if (config.Product_Type === "AI Decisioning Studio") {
    return `${title} AI Decisioning Studio Onboarding Plan`;
  }
  return `${title} ${labelForPlanOption(config.planOptionId)} Onboarding Plan`;
}
export const INDUSTRY_OPTIONS: IndustryType[] = [
  "Retail & eCommerce",
  "QSR",
  "Media, Gaming, and Entertainment",
  "Financial Services",
  "Healthcare & Life Sciences",
  "Other",
];
export const PRODUCT_OPTIONS: ProductType[] = ["Braze Core", "AI Decisioning Studio"];

/** Plan slug persisted for **AI Decisioning Studio** (fixed package; not shown in Braze Core picker). */
export const PLAN_PACKAGE_FOR_AI_DECISIONING_STUDIO: PlanOptionId = "ai_decisioning_studio";

