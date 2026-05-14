import {
  AI_DECISIONING_STUDIO_TIMELINE_WEEKS,
  WORKSTREAMS,
  durationWeeksForPlanOption,
  getAiDecisioningStudioSeedTemplate,
  getSeedTemplate,
  parseExplicitPlanOptionFromRecord,
  resolvePlanOptionId,
} from "@/lib/constants";
import { parseHexColorOptional } from "@/lib/tile-category-colors";
import {
  BRAZE_CORE_WORKSTREAM_IDS,
  brazeWorkstreamOrderIds,
  normalizeBrazeCoreWorkstreamOrder,
  parseBrazeCoreWorkstreamOrderJson,
  railColorResolverForWorkstreamOrder,
} from "@/lib/braze-workstream-order";
import {
  ConfigRecord,
  IndustryType,
  PlanDurationWeeks,
  PlanOptionId,
  ProductType,
  TileRecord,
  Workstream,
} from "@/lib/types";
import {
  EMPTY_TIMELINE_ANNOTATION_DOC,
  parseTimelineAnnotationField,
  serializeTimelineAnnotationDocument,
} from "@/lib/timeline-annotations";

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

function caboodleHeaders(): HeadersInit {
  const apiKey = requiredEnv("CABOODLE_API_KEY");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...caboodleHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Caboodle error (${response.status}): ${text}`;
    if (text.includes("No ID column configured or detected")) {
      message +=
        " Set ID Column on this Caboodle endpoint (Tiles sheet column ID → ID, Configs → Config_ID). Optional env: CABOODLE_TILES_ID_COLUMN / CABOODLE_CONFIGS_ID_COLUMN if your sheet uses different headers.";
    }
    if (text.includes("Could not read sheet headers")) {
      message +=
        " Usually transient Google Sheets access — retry once; confirm the Caboodle service account still has Editor access to the spreadsheet; avoid parallel bulk deletes elsewhere.";
    }
    if (text.includes("Quota exceeded")) {
      message +=
        " Google Sheets quota — wait ~1 minute and retry, or increase spacing with CABOODLE_DELETE_TILE_GAP_MS (default 600 ms between tile deletes, hard minimum for 100/min limit) and CABOODLE_SHEETS_QUOTA_BACKOFF_MS (default 62000 ms between retries).";
    }
    throw new Error(message);
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function configsApiBase() {
  return requiredEnv("CABOODLE_CONFIGS_API");
}

/** Must match the configs sheet column for the plan slug (`quickstart_gold`, `ignite_silver`, …). Default **Plan**. */
function configsPlanOptionField(): string {
  return process.env.CABOODLE_CONFIGS_PLAN_OPTION_FIELD?.trim() || "Plan";
}

function tilesApiBase() {
  return requiredEnv("CABOODLE_TILES_API");
}

type CaboodleListResponse<T> = {
  data?: T[];
};

function asList<T>(payload: CaboodleListResponse<T> | T[]): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.data ?? [];
}

function toNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Maps Caboodle `Duration_Weeks` to the nearest supported plan length (includes Ignite Gold 20). */
function coercePlanDurationWeeks(n: number): PlanDurationWeeks {
  if (n === 6 || n === 12 || n === 16 || n === 18 || n === 20 || n === 24 || n === 40 || n === 48) return n;
  if (!Number.isFinite(n)) return 12;
  const order: PlanDurationWeeks[] = [6, 12, 16, 18, 20, 24, 40, 48];
  return order.reduce((pick, w) => (Math.abs(w - n) < Math.abs(pick - n) ? w : pick), 12);
}

const TILE_WORKSTREAM_IDS = new Set<string>([
  "governance",
  "data",
  "tech",
  "email",
  "sms",
  "whatsapp",
  "campaign",
  "enablement",
  "one",
  "two",
  "three",
  "four",
]);

function normalizeTileWorkstream(raw: unknown): TileRecord["Workstream"] {
  const s = String(raw ?? "governance")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (TILE_WORKSTREAM_IDS.has(s)) return s as TileRecord["Workstream"];
  return "governance";
}

function pickTileNumber(record: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const key of keys) {
    const v = record[key];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function fallbackPasswordFromTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wait between each tile DELETE to avoid Sheets read quota bursts (each Caboodle call may trigger reads). */
function deleteBetweenTilesMs(): number {
  // Caboodle DELETE endpoint limit: 100 requests/minute.
  // Keep a safety margin so we never run faster than the documented cap.
  const maxDeletesPerMinute = 100;
  const hardMinGapMs = Math.ceil(60_000 / maxDeletesPerMinute);
  const raw = process.env.CABOODLE_DELETE_TILE_GAP_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  const configuredGapMs = Number.isFinite(n) && n >= 0 ? n : hardMinGapMs;
  return Math.max(hardMinGapMs, configuredGapMs);
}

/** Pause before retrying after Google `"Quota exceeded"` / rate-limit responses (per-minute window reset). */
function sheetsQuotaBackoffMs(): number {
  const raw = process.env.CABOODLE_SHEETS_QUOTA_BACKOFF_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 62_000;
}

function isSheetsQuotaOrRateLimit(message: string): boolean {
  return (
    message.includes("Quota exceeded") ||
    message.includes("quota metric") ||
    message.includes("Could not read sheet headers") ||
    message.includes("(429)") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Resource exhausted") ||
    /rate limit/i.test(message)
  );
}

async function caboodleRequestRetryOnQuota<T>(operation: () => Promise<T>): Promise<T> {
  const maxAttempts = 6;
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const retryable = isSheetsQuotaOrRateLimit(lastError.message);
      if (!retryable || attempt === maxAttempts) {
        throw lastError;
      }
      const jitter = Math.floor(Math.random() * 2500);
      await sleep(sheetsQuotaBackoffMs() + jitter);
    }
  }
  throw lastError;
}

/** Prefer explicit sheet **ID** / synthetic keys from Caboodle or Google. */
function extractPatchRowKey(record: Record<string, unknown>): string | undefined {
  const keys = [
    "ID",
    "_id",
    "id",
    "rowId",
    "UID",
    "Uid",
    "Row_Number",
    "row_number",
    "ROW_NUMBER",
    "Row Number",
    "rowNumber",
    "RowNumber",
    "__rowNumber",
  ];
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

/** Caboodle tiles endpoint ID Column — PATCH/DELETE must address rows via this header (`id` query/body uses same value). */
function tilesIdColumnHeader(): string {
  return process.env.CABOODLE_TILES_ID_COLUMN?.trim() || "ID";
}

/** Sheet column for tile slug (maps to app `TileRecord.Tile_ID`). */
function tilesSlugFromRecord(record: Record<string, unknown>): string {
  return String(record.Title_ID ?? record.Tile_ID ?? "").trim();
}

/** Tiles sheet **ID** column: `{Config_ID}__{tile_slug}` (slug matches constants template). */
function compositeTileRowId(configId: string, tileSlug: string): string {
  return `${configId}__${tileSlug}`;
}

function parseCompositeTileRowId(rowId: string): { configId: string; slug: string } {
  const sep = "__";
  const i = rowId.indexOf(sep);
  if (i === -1) return { configId: "", slug: rowId };
  return { configId: rowId.slice(0, i), slug: rowId.slice(i + sep.length) };
}

function configsIdColumnHeader(): string {
  return process.env.CABOODLE_CONFIGS_ID_COLUMN?.trim() || "Config_ID";
}

/** Tiles sheet foreign key to configs — GET filter lists rows for one plan. */
function tilesConfigIdColumnHeader(): string {
  return process.env.CABOODLE_TILES_CONFIG_ID_COLUMN?.trim() || "Config_ID";
}

async function fetchTileRawRow(
  configId: string,
  tileSlug: string,
): Promise<Record<string, unknown> | null> {
  const url = new URL(tilesApiBase());
  url.searchParams.set("filter", `ID[eq]${compositeTileRowId(configId, tileSlug)}`);
  const result = await request<CaboodleListResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    url.toString(),
  );
  const row = asList(result)[0];
  return row && typeof row === "object" ? (row as Record<string, unknown>) : null;
}

async function fetchConfigRawRow(configId: string): Promise<Record<string, unknown> | null> {
  const url = new URL(configsApiBase());
  url.searchParams.set("filter", `Config_ID[eq]${configId}`);
  const result = await request<CaboodleListResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    url.toString(),
  );
  const row = asList(result)[0];
  return row && typeof row === "object" ? (row as Record<string, unknown>) : null;
}

function configCreatedBy(record: Record<string, unknown>): string {
  const raw =
    record.Created_By ??
    record.created_by ??
    record["Created By"] ??
    record["created_by"];
  return String(raw ?? "").trim();
}

/**
 * Caboodle often omits keys on GET when unset — only `undefined`/`null` use `defaultWhenAbsent`.
 * Empty string is treated as off (explicit blank cell).
 */
function parseChannelBool(value: unknown, defaultWhenAbsent: boolean): boolean {
  if (value === undefined || value === null) return defaultWhenAbsent;
  if (value === "") return false;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (s === "") return false;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;
  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  return defaultWhenAbsent;
}

function normalizeChannels(record: Record<string, unknown>): ConfigRecord["channels"] {
  /** Missing column/key → show lane until Caboodle returns an explicit flag (avoids hiding all rows). */
  const email = parseChannelBool(
    record.Channel_Email ??
      record.channel_email ??
      record["Channel Email"] ??
      record.Email_Channel,
    true,
  );
  const sms = parseChannelBool(
    record.Channel_SMS ?? record.channel_sms ?? record["Channel SMS"] ?? record.SMS_Channel,
    true,
  );
  const whatsapp = parseChannelBool(
    record.Channel_WhatsApp ??
      record.channel_whatsapp ??
      record["Channel WhatsApp"] ??
      record.WhatsApp_Channel,
    true,
  );
  const inProductMessaging = parseChannelBool(
    record.Channel_InProduct ??
      record.channel_in_product ??
      record["Channel In-Product"] ??
      record.In_Product_Messaging,
    false,
  );
  return { email, sms, whatsapp, inProductMessaging };
}

function configBrazeWorkstreamOrderColumn(): string {
  return process.env.CABOODLE_CONFIG_WORKSTREAM_ORDER_COLUMN?.trim() || "Workstream_Order";
}

/** Configs sheet column for timeline marker JSON (must match Caboodle / Google Sheet header). */
function configTimelineAnnotationColumn(): string {
  return process.env.CABOODLE_CONFIG_TIMELINE_ANNOTATION_COLUMN?.trim() || "TimelineAnnotation";
}

function normalizeConfig(record: Record<string, unknown>): ConfigRecord {
  const configId = String(record.Config_ID ?? "");
  const productType = String(record.Product_Type ?? "Braze Core") as ProductType;
  const coercedDuration = coercePlanDurationWeeks(toNumber(record.Duration_Weeks, 12));
  const explicitPlan = parseExplicitPlanOptionFromRecord(record);
  const planOptionId =
    productType === "AI Decisioning Studio"
      ? "ai_decisioning_studio"
      : resolvePlanOptionId(record, coercedDuration);
  /**
   * If **Plan** (or legacy Plan_Option) is set, use canonical `Duration_Weeks` for that plan so the canvas matches.
   * If not, keep the sheet’s week count and infer plan from it (avoids e.g. every `24` row becoming Quickstart Gold).
   */
  let durationWeeks: PlanDurationWeeks = explicitPlan
    ? durationWeeksForPlanOption(explicitPlan)
    : coercedDuration;
  if (productType === "AI Decisioning Studio") {
    durationWeeks = AI_DECISIONING_STUDIO_TIMELINE_WEEKS;
  }
  const handoffUrlRaw =
    record.URL ??
    record.url ??
    record.Handoff_Doc_URL ??
    record["OM Notes URL"] ??
    record["Export URL"] ??
    "";
  const handoffDocUrl = String(handoffUrlRaw ?? "").trim();
  const chosenTitle = String(
    record.chosen_title ??
      record.Chosen_Title ??
      record.chosenTitle ??
      record["Chosen Title"] ??
      "",
  ).trim();

  const onboardingSessionTileColor = parseHexColorOptional(
    record.onboarding_color ??
      record.Onboarding_Color ??
      record.Onboarding_Session_Tile_Color ??
      record.Onboarding_Session_Color ??
      record.onboarding_session_tile_color,
  );
  const customerActivityTileColor = parseHexColorOptional(
    record.customer_color ??
      record.Customer_Color ??
      record.Customer_Activity_Tile_Color ??
      record.Customer_Activity_Color ??
      record.customer_activity_tile_color,
  );
  const buttonColor = parseHexColorOptional(
    record.Button_Color ?? record.button_color ?? record.buttonColor,
  );
  const workstreamGradientTopColor = parseHexColorOptional(
    record.workstream_color1 ??
      record.Workstream_Color1 ??
      record.Workstream_Color_1 ??
      record.workstream_color_top ??
      record.Workstream_Color_Top ??
      record.workstream_gradient_top_color,
  );
  const workstreamGradientBottomColor = parseHexColorOptional(
    record.workstream_color2 ??
      record.Workstream_Color2 ??
      record.Workstream_Color_2 ??
      record.workstream_color_bottom ??
      record.Workstream_Color_Bottom ??
      record.workstream_gradient_bottom_color,
  );

  const wsOrderCol = configBrazeWorkstreamOrderColumn();
  const wsOrderRaw = record[wsOrderCol] ?? record.Workstream_Order ?? record.workstream_order;
  const hasWsOrderRaw = wsOrderRaw != null && String(wsOrderRaw).trim() !== "";
  const brazeCoreWorkstreamOrder = hasWsOrderRaw
    ? parseBrazeCoreWorkstreamOrderJson(
        wsOrderRaw,
        workstreamGradientTopColor,
        workstreamGradientBottomColor,
      )
    : undefined;

  const taCol = configTimelineAnnotationColumn();
  const timelineAnnotation = parseTimelineAnnotationField(
    record[taCol] ??
      record.TimelineAnnotation ??
      record.timeline_annotation ??
      record.Timeline_Annotation,
  );

  return {
    Config_ID: configId,
    Title: String(record.Title ?? ""),
    ...(chosenTitle ? { chosenTitle } : {}),
    Product_Type: productType,
    Duration_Weeks: durationWeeks,
    planOptionId,
    Industry: String(record.Industry ?? "Other") as IndustryType,
    Password: String(record.Password ?? ""),
    Created_By: configCreatedBy(record),
    Last_Saved: record.Last_Saved ? String(record.Last_Saved) : undefined,
    CaboodlePatchKey: extractPatchRowKey(record) ?? configId,
    ...(handoffDocUrl ? { handoffDocUrl } : {}),
    ...(onboardingSessionTileColor ? { onboardingSessionTileColor } : {}),
    ...(customerActivityTileColor ? { customerActivityTileColor } : {}),
    ...(buttonColor ? { buttonColor } : {}),
    ...(workstreamGradientTopColor ? { workstreamGradientTopColor } : {}),
    ...(workstreamGradientBottomColor ? { workstreamGradientBottomColor } : {}),
    ...(brazeCoreWorkstreamOrder?.length ? { brazeCoreWorkstreamOrder } : {}),
    timelineAnnotation,
    channels: normalizeChannels(record),
  };
}

function normalizeTile(record: Record<string, unknown>): TileRecord {
  const rowId = String(record.ID ?? "").trim();
  const legacySlug = tilesSlugFromRecord(record);
  const sheetConfigId = String(record.Config_ID ?? "").trim();
  const parsed = rowId.includes("__")
    ? parseCompositeTileRowId(rowId)
    : { configId: "", slug: "" };
  const slug = legacySlug || parsed.slug;
  const configFk = sheetConfigId || parsed.configId;
  const caboodleKey =
    rowId ||
    extractPatchRowKey(record) ||
    (configFk && slug ? compositeTileRowId(configFk, slug) : "");

  const startRaw = pickTileNumber(
    record,
    ["Start_Week", "start_week", "Start_Column", "start_column", "Start Week", "Start Column"],
    1,
  );
  const spanRaw = pickTileNumber(
    record,
    ["Span_Weeks", "span_weeks", "Span_Columns", "span_columns", "Span Weeks", "Span Columns"],
    1,
  );
  const stackRaw = pickTileNumber(
    record,
    ["Stack_Order", "stack_order", "Stack Order"],
    1,
  );

  const notes = String(
    record.Notes ??
      record.notes ??
      record["Notes"] ??
      record["notes"] ??
      record.Note ??
      "",
  );

  const description = String(
    record.Description ??
      record.description ??
      record["Description"] ??
      record["description"] ??
      "",
  );

  /** Caboodle / sheet may use alternate headers (spacing, casing); match loosely on normalized keys. */
  function normalizeHeaderKey(key: string): string {
    return key.trim().toLowerCase().replace(/\s+/g, " ");
  }

  function pickMultiLineField(preferredKeys: string[]): string {
    for (const key of preferredKeys) {
      const v = record[key];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
    }
    const want = new Set(preferredKeys.map(normalizeHeaderKey));
    for (const [rawKey, value] of Object.entries(record)) {
      if (!want.has(normalizeHeaderKey(rawKey))) continue;
      if (value === undefined || value === null) continue;
      if (String(value).trim() === "") continue;
      return String(value);
    }
    return "";
  }

  const attendees = pickMultiLineField([
    "Attendees",
    "attendees",
    "Attendee",
    "Suggested Attendees",
    "Suggested_Attendees",
    "suggested_attendees",
  ]);
  const resources = pickMultiLineField(["Resources", "resources", "Resource"]);
  const desiredOutcomes = pickMultiLineField([
    "Desired_Outcomes",
    "Desired Outcomes",
    "desired_outcomes",
    "DesiredOutcomes",
  ]);
  const agenda = pickMultiLineField([
    "Agenda",
    "agenda",
    "Agenda_Text",
    "agenda_text",
    "Agenda Text",
  ]);

  return {
    Tile_ID: slug,
    Config_ID: configFk,
    Workstream: normalizeTileWorkstream(record.Workstream ?? record.workstream),
    Title: String(record.Title ?? ""),
    Start_Week: Math.max(1, Math.round(startRaw)),
    Span_Weeks: Math.max(1, Math.round(spanRaw)),
    Stack_Order: Math.max(1, Math.round(stackRaw)),
    Category: String(record.Category ?? "customer_activity") as TileRecord["Category"],
    Notes: notes,
    Description: description,
    Attendees: attendees,
    Agenda: agenda,
    Resources: resources,
    Desired_Outcomes: desiredOutcomes,
    CaboodlePatchKey: caboodleKey,
  };
}

export async function fetchConfigs(search?: string): Promise<ConfigRecord[]> {
  const url = new URL(configsApiBase());
  if (search?.trim()) {
    url.searchParams.set("filter", `Title[contains]${search.trim()}`);
  }
  const result = await request<CaboodleListResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    url.toString(),
  );
  return asList(result).map(normalizeConfig);
}

export async function fetchConfigByPassword(password: string): Promise<ConfigRecord | null> {
  const url = new URL(configsApiBase());
  url.searchParams.set("filter", `Password[eq]${password}`);
  const result = await request<CaboodleListResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    url.toString(),
  );
  const first = asList(result)[0];
  return first ? normalizeConfig(first) : null;
}

export async function fetchConfigById(configId: string): Promise<ConfigRecord | null> {
  const url = new URL(configsApiBase());
  url.searchParams.set("filter", `Config_ID[eq]${configId}`);
  const result = await request<CaboodleListResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    url.toString(),
  );
  const first = asList(result)[0];
  return first ? normalizeConfig(first) : null;
}

export async function fetchTiles(configId: string): Promise<TileRecord[]> {
  const url = new URL(tilesApiBase());
  const fkColumn = tilesConfigIdColumnHeader();
  url.searchParams.set("filter", `${fkColumn}[eq]${configId}`);
  const result = await request<CaboodleListResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    url.toString(),
  );
  return asList(result).map(normalizeTile);
}

export async function createConfigWithSeed(input: {
  title: string;
  productType: ProductType;
  industry: IndustryType;
  planOptionId: PlanOptionId;
  password?: string;
  createdBy: string;
  channels: ConfigRecord["channels"];
  onboardingSessionTileColor?: string;
  customerActivityTileColor?: string;
  buttonColor?: string;
  workstreamGradientTopColor?: string;
  workstreamGradientBottomColor?: string;
}): Promise<ConfigRecord> {
  const configId = `${input.title.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
  const resolvedPassword = input.password?.trim() || fallbackPasswordFromTitle(input.title);
  const ch = input.channels;
  const durationWeeks =
    input.productType === "AI Decisioning Studio"
      ? AI_DECISIONING_STUDIO_TIMELINE_WEEKS
      : durationWeeksForPlanOption(input.planOptionId);
  const planField = configsPlanOptionField();
  const onboardingHex = parseHexColorOptional(input.onboardingSessionTileColor);
  const customerHex = parseHexColorOptional(input.customerActivityTileColor);
  const buttonHex = parseHexColorOptional(input.buttonColor);
  const wsTopHex = parseHexColorOptional(input.workstreamGradientTopColor);
  const wsBottomHex = parseHexColorOptional(input.workstreamGradientBottomColor);
  const isBrazeCore = input.productType !== "AI Decisioning Studio";
  const defaultOrderRail = railColorResolverForWorkstreamOrder(
    [...BRAZE_CORE_WORKSTREAM_IDS],
    wsTopHex,
    wsBottomHex,
  );
  const defaultWorkstreamOrderJson = JSON.stringify(
    normalizeBrazeCoreWorkstreamOrder(undefined, defaultOrderRail),
  );
  await request(configsApiBase(), {
    method: "POST",
    body: JSON.stringify({
      Config_ID: configId,
      Title: input.title,
      Product_Type: input.productType,
      Duration_Weeks: durationWeeks,
      [planField]: input.planOptionId,
      Industry: input.industry,
      Password: resolvedPassword,
      Created_By: input.createdBy,
      Last_Saved: new Date().toISOString(),
      [configHandoffUrlColumn()]: "",
      Channel_Email: Boolean(ch.email),
      Channel_SMS: Boolean(ch.sms),
      Channel_WhatsApp: Boolean(ch.whatsapp),
      Channel_InProduct: Boolean(ch.inProductMessaging),
      ...(onboardingHex ? { onboarding_color: onboardingHex } : {}),
      ...(customerHex ? { customer_color: customerHex } : {}),
      ...(buttonHex ? { Button_Color: buttonHex } : {}),
      ...(wsTopHex ? { workstream_color1: wsTopHex } : {}),
      ...(wsBottomHex ? { workstream_color2: wsBottomHex } : {}),
      ...(isBrazeCore ? { [configBrazeWorkstreamOrderColumn()]: defaultWorkstreamOrderJson } : {}),
      [configTimelineAnnotationColumn()]: serializeTimelineAnnotationDocument(EMPTY_TIMELINE_ANNOTATION_DOC),
    }),
  });

  const seedTiles = (
    input.productType === "AI Decisioning Studio"
      ? getAiDecisioningStudioSeedTemplate()
      : getSeedTemplate(input.planOptionId).filter((tile) => {
          if (tile.Workstream === "email" && !ch.email) return false;
          if (tile.Workstream === "sms" && !ch.sms) return false;
          if (tile.Workstream === "whatsapp" && !ch.whatsapp) return false;
          return true;
        })
  ).map((tile) => {
    const slug = tile.Tile_ID;
    const rowId = compositeTileRowId(configId, slug);
    return {
      ID: rowId,
      Title_ID: slug,
      Config_ID: configId,
      Workstream: tile.Workstream,
      Title: tile.Title,
      Start_Week: tile.Start_Week,
      Span_Weeks: tile.Span_Weeks,
      Stack_Order: tile.Stack_Order,
      Category: tile.Category,
      Notes: "",
      Description: "",
      Attendees: "",
      Resources: "",
      Desired_Outcomes: "",
      Agenda: "",
    };
  });

  await Promise.all(
    seedTiles.map((payload) =>
      request(tilesApiBase(), {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    ),
  );

  const created = await fetchConfigById(configId);
  if (!created) {
    throw new Error("Config was created but could not be reloaded.");
  }
  /** Caboodle GET often omits Channel_* keys; use what we just persisted so the canvas hides rows correctly. */
  return {
    ...created,
    channels: input.channels,
    ...(isBrazeCore
      ? { brazeCoreWorkstreamOrder: normalizeBrazeCoreWorkstreamOrder(undefined, defaultOrderRail) }
      : {}),
    ...(onboardingHex ? { onboardingSessionTileColor: onboardingHex } : {}),
    ...(customerHex ? { customerActivityTileColor: customerHex } : {}),
    ...(buttonHex ? { buttonColor: buttonHex } : {}),
    ...(wsTopHex ? { workstreamGradientTopColor: wsTopHex } : {}),
    ...(wsBottomHex ? { workstreamGradientBottomColor: wsBottomHex } : {}),
  };
}

/** Deep-copies a config row and all tiles; new guest password is unique (not copied from source). */
export async function duplicateConfig(sourceConfigId: string, createdBy: string): Promise<ConfigRecord> {
  const source = await fetchConfigById(sourceConfigId);
  if (!source) {
    throw new Error(`Config not found: ${sourceConfigId}`);
  }
  const tiles = await fetchTiles(sourceConfigId);

  const baseTitle = source.Title.trim() || "Timeline";
  const dupTitle = `Copy of ${baseTitle}`;
  const slugBase = dupTitle
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const configId = `${slugBase || "copy"}-${Math.random().toString(36).slice(2, 8)}`;
  const resolvedPassword = `${fallbackPasswordFromTitle(dupTitle)}${Math.floor(1000 + Math.random() * 9000)}`;
  const ch = source.channels;
  const planField = configsPlanOptionField();
  const onboardingHex = parseHexColorOptional(source.onboardingSessionTileColor ?? "");
  const customerHex = parseHexColorOptional(source.customerActivityTileColor ?? "");
  const buttonHex = parseHexColorOptional(source.buttonColor ?? "");
  const wsTopHex = parseHexColorOptional(source.workstreamGradientTopColor ?? "");
  const wsBottomHex = parseHexColorOptional(source.workstreamGradientBottomColor ?? "");
  const isBrazeCore = source.Product_Type !== "AI Decisioning Studio";
  const dupOrderRail = railColorResolverForWorkstreamOrder(
    source.brazeCoreWorkstreamOrder?.length
      ? brazeWorkstreamOrderIds(source.brazeCoreWorkstreamOrder)
      : [...BRAZE_CORE_WORKSTREAM_IDS],
    wsTopHex,
    wsBottomHex,
  );
  const defaultWorkstreamOrderJson = JSON.stringify(
    normalizeBrazeCoreWorkstreamOrder(undefined, dupOrderRail),
  );

  await request(configsApiBase(), {
    method: "POST",
    body: JSON.stringify({
      Config_ID: configId,
      Title: dupTitle,
      Product_Type: source.Product_Type,
      Duration_Weeks: source.Duration_Weeks,
      [planField]: source.planOptionId,
      Industry: source.Industry,
      Password: resolvedPassword,
      Created_By: createdBy,
      Last_Saved: new Date().toISOString(),
      [configHandoffUrlColumn()]: "",
      Channel_Email: Boolean(ch.email),
      Channel_SMS: Boolean(ch.sms),
      Channel_WhatsApp: Boolean(ch.whatsapp),
      Channel_InProduct: Boolean(ch.inProductMessaging),
      ...(onboardingHex ? { onboarding_color: onboardingHex } : {}),
      ...(customerHex ? { customer_color: customerHex } : {}),
      ...(buttonHex ? { Button_Color: buttonHex } : {}),
      ...(wsTopHex ? { workstream_color1: wsTopHex } : {}),
      ...(wsBottomHex ? { workstream_color2: wsBottomHex } : {}),
      ...(isBrazeCore
        ? {
            [configBrazeWorkstreamOrderColumn()]:
              source.brazeCoreWorkstreamOrder?.length
                ? JSON.stringify(source.brazeCoreWorkstreamOrder)
                : defaultWorkstreamOrderJson,
          }
        : {}),
      [configTimelineAnnotationColumn()]: serializeTimelineAnnotationDocument(
        source.timelineAnnotation ?? EMPTY_TIMELINE_ANNOTATION_DOC,
      ),
    }),
  });

  await Promise.all(
    tiles.map((t) =>
      createTileRow(configId, {
        Tile_ID: t.Tile_ID,
        Workstream: t.Workstream,
        Title: t.Title,
        Start_Week: t.Start_Week,
        Span_Weeks: t.Span_Weeks,
        Stack_Order: t.Stack_Order,
        Category: t.Category,
        Notes: t.Notes ?? "",
        Description: t.Description ?? "",
        Attendees: t.Attendees,
        Agenda: t.Agenda,
        Resources: t.Resources,
        Desired_Outcomes: t.Desired_Outcomes,
      }),
    ),
  );

  const created = await fetchConfigById(configId);
  if (!created) {
    throw new Error("Duplicate config was created but could not be reloaded.");
  }
  return {
    ...created,
    channels: ch,
    ...(isBrazeCore
      ? {
          brazeCoreWorkstreamOrder: source.brazeCoreWorkstreamOrder?.length
            ? source.brazeCoreWorkstreamOrder.map((e) => ({ ...e }))
            : normalizeBrazeCoreWorkstreamOrder(undefined, dupOrderRail),
        }
      : {}),
    ...(onboardingHex ? { onboardingSessionTileColor: onboardingHex } : {}),
    ...(customerHex ? { customerActivityTileColor: customerHex } : {}),
    ...(buttonHex ? { buttonColor: buttonHex } : {}),
    ...(wsTopHex ? { workstreamGradientTopColor: wsTopHex } : {}),
    ...(wsBottomHex ? { workstreamGradientBottomColor: wsBottomHex } : {}),
  };
}

/** Updates tile placement and optional copy fields using Caboodle row key from sheet column **ID** only (not Title_ID). */
export async function patchTilesLayout(
  configId: string,
  updates: Array<
    Pick<TileRecord, "Tile_ID" | "Start_Week" | "Workstream"> & {
      Notes?: string;
      Span_Weeks?: number;
      Title?: string;
      Description?: string;
      Attendees?: string;
      Agenda?: string;
      Resources?: string;
      Desired_Outcomes?: string;
    }
  >,
): Promise<void> {
  if (!updates.length) return;

  const idColumn = tilesIdColumnHeader();

  await Promise.all(
    updates.map(async (update) => {
      const slug = String(update.Tile_ID ?? "").trim();
      if (!slug) {
        throw new Error("Cannot PATCH tile without content slug (TileRecord.Tile_ID).");
      }

      const raw = await fetchTileRawRow(configId, slug);
      const patchKey = raw
        ? String(raw.ID ?? "").trim() || extractPatchRowKey(raw) || compositeTileRowId(configId, slug)
        : compositeTileRowId(configId, slug);

      const body: Record<string, unknown> = {
        id: patchKey,
        Start_Week: update.Start_Week,
        Workstream: update.Workstream,
      };
      body[idColumn] = patchKey;
      if (update.Notes !== undefined) {
        body.Notes = update.Notes;
      }
      if (update.Span_Weeks !== undefined) {
        body.Span_Weeks = update.Span_Weeks;
      }
      if (update.Title !== undefined) {
        body.Title = update.Title;
      }
      if (update.Description !== undefined) {
        body.Description = update.Description;
      }
      if (update.Agenda !== undefined) {
        body.Agenda = update.Agenda;
      }
      if (update.Attendees !== undefined) {
        body.Attendees = update.Attendees;
      }
      if (update.Resources !== undefined) {
        body.Resources = update.Resources;
      }
      if (update.Desired_Outcomes !== undefined) {
        body.Desired_Outcomes = update.Desired_Outcomes;
      }

      return request(tilesApiBase(), {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    }),
  );
}

/** Appends one row to the Caboodle tiles sheet (POST). */
export async function createTileRow(
  configId: string,
  tile: Pick<
    TileRecord,
    | "Tile_ID"
    | "Workstream"
    | "Title"
    | "Start_Week"
    | "Span_Weeks"
    | "Stack_Order"
    | "Category"
    | "Notes"
    | "Description"
  > &
    Partial<Pick<TileRecord, "Attendees" | "Agenda" | "Resources" | "Desired_Outcomes">>,
): Promise<void> {
  const slug = String(tile.Tile_ID ?? "").trim();
  if (!slug) throw new Error("createTileRow: Tile_ID is required.");
  const rowId = compositeTileRowId(configId, slug);
  const payload: Record<string, unknown> = {
    ID: rowId,
    Title_ID: slug,
    Config_ID: configId,
    Workstream: tile.Workstream,
    Title: tile.Title,
    Start_Week: tile.Start_Week,
    Span_Weeks: tile.Span_Weeks,
    Stack_Order: tile.Stack_Order,
    Category: tile.Category,
    Notes: tile.Notes ?? "",
    Description: tile.Description ?? "",
    Attendees: tile.Attendees ?? "",
    Agenda: tile.Agenda ?? "",
    Resources: tile.Resources ?? "",
    Desired_Outcomes: tile.Desired_Outcomes ?? "",
  };
  await request(tilesApiBase(), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function configHandoffUrlColumn(): string {
  return process.env.CABOODLE_CONFIG_HANDOFF_URL_COLUMN?.trim() || "URL";
}

export async function patchConfig(
  configId: string,
  updates: Partial<
    Pick<
      ConfigRecord,
      | "Title"
      | "chosenTitle"
      | "Product_Type"
      | "Duration_Weeks"
      | "Industry"
      | "Password"
      | "planOptionId"
      | "handoffDocUrl"
      | "onboardingSessionTileColor"
      | "customerActivityTileColor"
      | "buttonColor"
      | "workstreamGradientTopColor"
      | "workstreamGradientBottomColor"
      | "brazeCoreWorkstreamOrder"
      | "timelineAnnotation"
    >
  >,
): Promise<void> {
  const sheetUpdates: Record<string, unknown> = {};
  if (updates.Title !== undefined) sheetUpdates.Title = updates.Title;
  if (updates.chosenTitle !== undefined) sheetUpdates.chosen_title = String(updates.chosenTitle).trim();
  if (updates.Product_Type !== undefined) sheetUpdates.Product_Type = updates.Product_Type;
  if (updates.Industry !== undefined) sheetUpdates.Industry = updates.Industry;
  if (updates.Password !== undefined) sheetUpdates.Password = updates.Password;
  if (updates.handoffDocUrl !== undefined) {
    sheetUpdates[configHandoffUrlColumn()] = updates.handoffDocUrl;
  }
  if (updates.brazeCoreWorkstreamOrder !== undefined) {
    const railFallback = (ws: Workstream) =>
      WORKSTREAMS.find((w) => w.id === ws)?.color ?? "#300266";
    sheetUpdates[configBrazeWorkstreamOrderColumn()] = JSON.stringify(
      normalizeBrazeCoreWorkstreamOrder(updates.brazeCoreWorkstreamOrder, railFallback),
    );
  }
  if (updates.onboardingSessionTileColor !== undefined) {
    const v = parseHexColorOptional(updates.onboardingSessionTileColor);
    sheetUpdates.onboarding_color = v ?? "";
  }
  if (updates.customerActivityTileColor !== undefined) {
    const v = parseHexColorOptional(updates.customerActivityTileColor);
    sheetUpdates.customer_color = v ?? "";
  }
  if (updates.buttonColor !== undefined) {
    const v = parseHexColorOptional(updates.buttonColor);
    sheetUpdates.Button_Color = v ?? "";
  }
  if (updates.workstreamGradientTopColor !== undefined) {
    const v = parseHexColorOptional(updates.workstreamGradientTopColor);
    sheetUpdates.workstream_color1 = v ?? "";
  }
  if (updates.workstreamGradientBottomColor !== undefined) {
    const v = parseHexColorOptional(updates.workstreamGradientBottomColor);
    sheetUpdates.workstream_color2 = v ?? "";
  }
  if (updates.planOptionId !== undefined) {
    sheetUpdates[configsPlanOptionField()] = updates.planOptionId;
  }
  if (updates.timelineAnnotation !== undefined) {
    sheetUpdates[configTimelineAnnotationColumn()] = serializeTimelineAnnotationDocument(
      updates.timelineAnnotation,
    );
  }

  let durationCommitted = false;
  if (updates.Product_Type === "AI Decisioning Studio") {
    sheetUpdates.Duration_Weeks = AI_DECISIONING_STUDIO_TIMELINE_WEEKS;
    durationCommitted = true;
  }
  if (!durationCommitted && updates.planOptionId !== undefined) {
    sheetUpdates.Duration_Weeks = durationWeeksForPlanOption(updates.planOptionId);
    durationCommitted = true;
  }
  if (!durationCommitted && updates.Duration_Weeks !== undefined) {
    sheetUpdates.Duration_Weeks = updates.Duration_Weeks;
  }

  const raw = await fetchConfigRawRow(configId);
  const patchKey = raw ? extractPatchRowKey(raw) ?? configId : configId;
  const idColumn = configsIdColumnHeader();

  const body: Record<string, unknown> = {
    id: patchKey,
    Config_ID: configId,
    ...sheetUpdates,
    Last_Saved: new Date().toISOString(),
  };
  body[idColumn] = patchKey;

  await request(configsApiBase(), {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

async function deleteTileRowsJson(apiBase: string, patchKey: string): Promise<void> {
  const qsUrl = new URL(apiBase);
  qsUrl.searchParams.set("id", patchKey);
  await caboodleRequestRetryOnQuota(() =>
    request(qsUrl.toString(), {
      method: "DELETE",
    }),
  );
}

async function tileRowStillAttachedToConfig(
  apiBase: string,
  configId: string,
  rowId: string,
): Promise<boolean> {
  const idColumn = tilesIdColumnHeader();
  const fkColumn = tilesConfigIdColumnHeader();
  const url = new URL(apiBase);
  url.searchParams.set("filter", `(${idColumn}[eq]${rowId}) AND (${fkColumn}[eq]${configId})`);

  const payload = await caboodleRequestRetryOnQuota(() =>
    request<CaboodleListResponse<Record<string, unknown>> | Record<string, unknown>[]>(url.toString()),
  );
  return asList(payload).length > 0;
}

async function detachTileRowFromConfig(
  apiBase: string,
  configId: string,
  rowId: string,
): Promise<string> {
  const idColumn = tilesIdColumnHeader();
  const detachedConfigId = `deleted__${configId}`;
  const body: Record<string, unknown> = {
    id: rowId,
    Config_ID: detachedConfigId,
  };
  body[idColumn] = rowId;

  await caboodleRequestRetryOnQuota(() =>
    request(apiBase, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  );
  return detachedConfigId;
}

async function deleteTileRowEnsuringRemoved(
  apiBase: string,
  configId: string,
  rowId: string,
): Promise<"deleted" | "detached"> {
  await deleteTileRowsJson(apiBase, rowId);
  const stillAttachedAfterDelete = await tileRowStillAttachedToConfig(apiBase, configId, rowId);
  if (!stillAttachedAfterDelete) return "deleted";

  console.warn("[tiles.delete] DELETE reported success but row still attached; using PATCH fallback", {
    configId,
    rowId,
  });
  const detachedConfigId = await detachTileRowFromConfig(apiBase, configId, rowId);
  const stillAttachedAfterDetach = await tileRowStillAttachedToConfig(apiBase, configId, rowId);
  if (stillAttachedAfterDetach) {
    throw new Error(
      `Row ${rowId} is still attached to ${configId} after DELETE + PATCH fallback (detached target ${detachedConfigId}).`,
    );
  }
  return "detached";
}

/** Lists tile row IDs for a config so they can be deleted after config DELETE succeeds. */
export async function fetchTileDeleteKeysForConfig(configId: string): Promise<string[]> {
  const url = new URL(tilesApiBase());
  const fkColumn = tilesConfigIdColumnHeader();
  const idColumn = tilesIdColumnHeader();
  url.searchParams.set("filter", `${fkColumn}[eq]${configId}`);

  const result = await caboodleRequestRetryOnQuota(() =>
    request<CaboodleListResponse<Record<string, unknown>> | Record<string, unknown>[]>(url.toString()),
  );
  const rows = asList(result);

  const missingIds: number[] = [];
  const keys = rows
    .map((row, index) => {
      const idFromConfiguredColumn = row[idColumn];
      const normalized = String(idFromConfiguredColumn ?? "").trim();
      if (normalized) return normalized;

      missingIds.push(index);
      const fallback = extractPatchRowKey(row);
      return fallback?.trim() || "";
    })
    .filter((key) => key.length > 0);

  const uniqueKeys = Array.from(new Set(keys));
  console.log("[tiles.delete] queued tile row IDs", {
    configId,
    fkColumn,
    idColumn,
    rowCount: rows.length,
    queuedCount: uniqueKeys.length,
    missingConfiguredIdAtRowIndexes: missingIds,
    tileRowIds: uniqueKeys,
  });

  if (rows.length > 0 && uniqueKeys.length === 0) {
    console.error("[tiles.delete] No tile row IDs could be resolved from rows", {
      configId,
      idColumn,
      sampleRowKeys: Object.keys(rows[0] ?? {}),
    });
  }

  return uniqueKeys;
}

async function deleteConfigRow(apiBase: string, patchKey: string): Promise<void> {
  const qsUrl = new URL(apiBase);
  qsUrl.searchParams.set("id", patchKey);
  await caboodleRequestRetryOnQuota(() =>
    request(qsUrl.toString(), {
      method: "DELETE",
    }),
  );
}

/** Deletes only the config row so UI can move on while tile cleanup continues asynchronously. */
export async function deleteConfigOnly(configId: string): Promise<void> {
  // Avoid an extra configs GET (sheet read) — Caboodle configs endpoint uses Config_ID as row key for ?id=.
  await deleteConfigRow(configsApiBase(), configId);
}

/**
 * Deletes tile rows from pre-fetched row IDs.
 * Deletes one tile row at a time. If DELETE no-ops, PATCH fallback detaches Config_ID.
 * @returns how many tile row keys were targeted (0 if none).
 */
export async function deleteTilesByKeys(configId: string, tileRowKeys: string[]): Promise<number> {
  const keys = tileRowKeys.map((key) => key.trim()).filter((key) => key.length > 0);
  if (!keys.length) return 0;

  const apiBase = tilesApiBase();

  const gapMs = deleteBetweenTilesMs();
  let removedCount = 0;
  let detachedCount = 0;
  const failedDeletes: Array<{ key: string; message: string }> = [];

  for (let i = 0; i < keys.length; i++) {
    if (i > 0) {
      await sleep(gapMs);
    }

    const rowId = keys[i]!;
    console.log("[tiles.delete] deleting row", {
      index: i + 1,
      total: keys.length,
      rowId,
    });

    try {
      const outcome = await deleteTileRowEnsuringRemoved(apiBase, configId, rowId);
      removedCount += 1;
      if (outcome === "detached") detachedCount += 1;
      console.log("[tiles.delete] removed row", {
        index: i + 1,
        total: keys.length,
        rowId,
        outcome,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failedDeletes.push({ key: rowId, message });
      console.error("[tiles.delete] failed row delete", {
        index: i + 1,
        total: keys.length,
        rowId,
        error: message,
      });
    }
  }

  console.log("[tiles.delete] delete run complete", {
    requested: keys.length,
    removed: removedCount,
    detached: detachedCount,
    failed: failedDeletes.length,
    failedRowIds: failedDeletes.map((f) => f.key),
  });

  if (failedDeletes.length > 0) {
    const first = failedDeletes[0]!;
    throw new Error(
      `Failed to remove ${failedDeletes.length} tile rows (removed ${removedCount}/${keys.length}). First failed ID ${first.key}: ${first.message}`,
    );
  }

  return removedCount;
}
