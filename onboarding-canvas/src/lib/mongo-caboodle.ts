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
import { parseTimelineDatesField, serializeTimelineDates } from "@/lib/timeline-dates";
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
import { getMongoCollections } from "@/lib/mongodb";

function toNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coercePlanDurationWeeks(n: number): PlanDurationWeeks {
  if (n === 6 || n === 12 || n === 16 || n === 18 || n === 20 || n === 24 || n === 40 || n === 48) return n;
  if (!Number.isFinite(n)) return 12;
  const order: PlanDurationWeeks[] = [6, 12, 16, 18, 20, 24, 40, 48];
  return order.reduce((pick, w) => (Math.abs(w - n) < Math.abs(pick - n) ? w : pick), 12);
}

function fallbackPasswordFromTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, "");
}

function configCreatedBy(record: Record<string, unknown>): string {
  const raw =
    record.Created_By ??
    record.created_by ??
    record["Created By"] ??
    record["created_by"];
  return String(raw ?? "").trim();
}

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

function compositeTileRowId(configId: string, tileSlug: string): string {
  return `${configId}__${tileSlug}`;
}

function parseCompositeTileRowId(rowId: string): { configId: string; slug: string } {
  const sep = "__";
  const i = rowId.indexOf(sep);
  if (i === -1) return { configId: "", slug: rowId };
  return { configId: rowId.slice(0, i), slug: rowId.slice(i + sep.length) };
}

const LOGO_ASSET_TYPE = "logo";
const MAX_LOGO_BYTES = 1_500_000; // ~1.5MB
const MIN_LOGO_DISPLAY_HEIGHT_PX = 20;
const MAX_LOGO_DISPLAY_HEIGHT_PX = 60;
const ALLOWED_LOGO_MIME_TYPES = new Set([
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/avif",
]);

function normalizeLogoDataUrl(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(raw);
  if (!match) {
    throw new Error("Invalid logo format. Please upload a PNG, SVG, WebP, or AVIF image.");
  }
  const mimeType = match[1]!.toLowerCase();
  if (!ALLOWED_LOGO_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported logo type. Use PNG, SVG, WebP, or AVIF.");
  }
  const base64 = match[2]!;
  const bytes = Buffer.byteLength(base64, "base64");
  if (!Number.isFinite(bytes) || bytes <= 0) {
    throw new Error("Invalid logo data.");
  }
  if (bytes > MAX_LOGO_BYTES) {
    throw new Error("Logo file is too large (max 1.5MB).");
  }
  return `data:${mimeType};base64,${base64}`;
}

function normalizeLogoDisplayHeightPx(value: unknown): number | undefined {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(MIN_LOGO_DISPLAY_HEIGHT_PX, Math.min(MAX_LOGO_DISPLAY_HEIGHT_PX, Math.round(parsed)));
}

async function fetchConfigLogoDataUrl(configId: string): Promise<string | undefined> {
  const { assets } = await getMongoCollections();
  const doc = await assets.findOne(
    { Config_ID: configId, Asset_Type: LOGO_ASSET_TYPE },
    { projection: { Data_URL: 1 } },
  );
  const dataUrl = String((doc as Record<string, unknown> | null)?.Data_URL ?? "").trim();
  return dataUrl || undefined;
}

async function upsertConfigLogoDataUrl(configId: string, logoDataUrl: string | undefined): Promise<void> {
  const { assets } = await getMongoCollections();
  if (!logoDataUrl) {
    await assets.deleteOne({ Config_ID: configId, Asset_Type: LOGO_ASSET_TYPE });
    return;
  }
  await assets.updateOne(
    { Config_ID: configId, Asset_Type: LOGO_ASSET_TYPE },
    {
      $set: {
        Config_ID: configId,
        Asset_Type: LOGO_ASSET_TYPE,
        Data_URL: logoDataUrl,
        Updated_At: new Date().toISOString(),
      },
      $setOnInsert: { Created_At: new Date().toISOString() },
    },
    { upsert: true },
  );
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

function pickMultiLineField(record: Record<string, unknown>, preferredKeys: string[]): string {
  for (const key of preferredKeys) {
    const v = record[key];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
  }
  return "";
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

  let durationWeeks: PlanDurationWeeks = explicitPlan
    ? durationWeeksForPlanOption(explicitPlan)
    : coercedDuration;
  if (productType === "AI Decisioning Studio") {
    durationWeeks = AI_DECISIONING_STUDIO_TIMELINE_WEEKS;
  }

  const handoffDocUrl = String(
    record.URL ??
      record.url ??
      record.Handoff_Doc_URL ??
      record["OM Notes URL"] ??
      record["Export URL"] ??
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

  const wsOrderRaw = record.Workstream_Order ?? record.workstream_order;
  const hasWsOrderRaw = wsOrderRaw != null && String(wsOrderRaw).trim() !== "";
  const brazeCoreWorkstreamOrder = hasWsOrderRaw
    ? parseBrazeCoreWorkstreamOrderJson(
        wsOrderRaw,
        workstreamGradientTopColor,
        workstreamGradientBottomColor,
      )
    : undefined;

  const timelineAnnotation = parseTimelineAnnotationField(
    record.TimelineAnnotation ??
      record.timeline_annotation ??
      record.Timeline_Annotation,
  );
  const timelineDates = parseTimelineDatesField(
    record.Timeline_Dates ?? record.timeline_dates ?? record.timelineDates,
  );
  const chosenTitle = String(
    record.chosen_title ??
      record.Chosen_Title ??
      record.chosenTitle ??
      record["Chosen Title"] ??
      "",
  ).trim();
  const logoDisplayHeightPx = normalizeLogoDisplayHeightPx(
    record.logo_display_height_px ??
      record.Logo_Display_Height_Px ??
      record.logoDisplayHeightPx,
  );

  return {
    Config_ID: configId,
    Title: String(record.Title ?? ""),
    ...(chosenTitle ? { chosenTitle } : {}),
    ...(logoDisplayHeightPx ? { logoDisplayHeightPx } : {}),
    Product_Type: productType,
    Duration_Weeks: durationWeeks,
    planOptionId,
    Industry: String(record.Industry ?? "Other") as IndustryType,
    Password: String(record.Password ?? ""),
    Created_By: configCreatedBy(record),
    Last_Saved: record.Last_Saved ? String(record.Last_Saved) : undefined,
    ...(handoffDocUrl ? { handoffDocUrl } : {}),
    ...(onboardingSessionTileColor ? { onboardingSessionTileColor } : {}),
    ...(customerActivityTileColor ? { customerActivityTileColor } : {}),
    ...(buttonColor ? { buttonColor } : {}),
    ...(workstreamGradientTopColor ? { workstreamGradientTopColor } : {}),
    ...(workstreamGradientBottomColor ? { workstreamGradientBottomColor } : {}),
    ...(brazeCoreWorkstreamOrder?.length ? { brazeCoreWorkstreamOrder } : {}),
    timelineAnnotation,
    ...(timelineDates?.length ? { timelineDates } : {}),
    channels: normalizeChannels(record),
  };
}

function normalizeTile(record: Record<string, unknown>): TileRecord {
  const rowId = String(record.ID ?? "").trim();
  const legacySlug = String(record.Title_ID ?? record.Tile_ID ?? "").trim();
  const sheetConfigId = String(record.Config_ID ?? "").trim();
  const parsed = rowId.includes("__")
    ? parseCompositeTileRowId(rowId)
    : { configId: "", slug: "" };
  const slug = legacySlug || parsed.slug;
  const configFk = sheetConfigId || parsed.configId;
  const patchKey = rowId || (configFk && slug ? compositeTileRowId(configFk, slug) : "");

  return {
    Tile_ID: slug,
    Config_ID: configFk,
    Workstream: normalizeTileWorkstream(record.Workstream ?? record.workstream),
    Title: String(record.Title ?? ""),
    Start_Week: Math.max(1, Math.round(toNumber(record.Start_Week, 1))),
    Span_Weeks: Math.max(1, Math.round(toNumber(record.Span_Weeks, 1))),
    Stack_Order: Math.max(1, Math.round(toNumber(record.Stack_Order, 1))),
    Row_Span: Math.max(
      1,
      Math.round(toNumber(record.Row_Span ?? record.row_span ?? record.RowSpan, 1)),
    ),
    Category: String(record.Category ?? "customer_activity") as TileRecord["Category"],
    Notes: String(record.Notes ?? ""),
    Description: String(record.Description ?? ""),
    Attendees: pickMultiLineField(record, ["Attendees", "attendees", "Suggested Attendees"]),
    Agenda: pickMultiLineField(record, ["Agenda", "agenda"]),
    Resources: pickMultiLineField(record, ["Resources", "resources"]),
    Desired_Outcomes: pickMultiLineField(record, ["Desired_Outcomes", "Desired Outcomes", "desired_outcomes"]),
    CaboodlePatchKey: patchKey,
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function fetchConfigs(search?: string): Promise<ConfigRecord[]> {
  const { configs } = await getMongoCollections();
  const needle = search?.trim();
  const filter =
    needle && needle.length > 0
      ? {
          $or: [
            { Title: { $regex: escapeRegExp(needle), $options: "i" } },
            { chosen_title: { $regex: escapeRegExp(needle), $options: "i" } },
          ],
        }
      : {};
  const docs = await configs.find(filter).sort({ Last_Saved: -1, Title: 1 }).toArray();
  return docs.map((doc) => normalizeConfig(doc as unknown as Record<string, unknown>));
}

export async function fetchConfigByPassword(password: string): Promise<ConfigRecord | null> {
  const { configs } = await getMongoCollections();
  const doc = await configs.findOne({ Password: password });
  if (!doc) return null;
  const normalized = normalizeConfig(doc as unknown as Record<string, unknown>);
  const logoDataUrl = await fetchConfigLogoDataUrl(normalized.Config_ID);
  return logoDataUrl ? { ...normalized, logoDataUrl } : normalized;
}

export async function fetchConfigById(configId: string): Promise<ConfigRecord | null> {
  const { configs } = await getMongoCollections();
  const doc = await configs.findOne({ Config_ID: configId });
  if (!doc) return null;
  const normalized = normalizeConfig(doc as unknown as Record<string, unknown>);
  const logoDataUrl = await fetchConfigLogoDataUrl(normalized.Config_ID);
  return logoDataUrl ? { ...normalized, logoDataUrl } : normalized;
}

export async function fetchTiles(configId: string): Promise<TileRecord[]> {
  const { tiles } = await getMongoCollections();
  const docs = await tiles
    .find({ Config_ID: configId })
    .sort({ Workstream: 1, Start_Week: 1, Stack_Order: 1 })
    .toArray();
  return docs.map((doc) => normalizeTile(doc as unknown as Record<string, unknown>));
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
  logoDataUrl?: string;
  timelineDates?: string[];
}): Promise<ConfigRecord> {
  const { configs, tiles } = await getMongoCollections();
  const configId = `${input.title.toLowerCase().replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;
  const resolvedPassword = input.password?.trim() || fallbackPasswordFromTitle(input.title);
  const ch = input.channels;
  const durationWeeks =
    input.productType === "AI Decisioning Studio"
      ? AI_DECISIONING_STUDIO_TIMELINE_WEEKS
      : durationWeeksForPlanOption(input.planOptionId);

  const onboardingHex = parseHexColorOptional(input.onboardingSessionTileColor);
  const customerHex = parseHexColorOptional(input.customerActivityTileColor);
  const buttonHex = parseHexColorOptional(input.buttonColor);
  const wsTopHex = parseHexColorOptional(input.workstreamGradientTopColor);
  const wsBottomHex = parseHexColorOptional(input.workstreamGradientBottomColor);
  const logoDataUrl = normalizeLogoDataUrl(input.logoDataUrl);
  const isBrazeCore = input.productType !== "AI Decisioning Studio";
  const defaultOrderRail = railColorResolverForWorkstreamOrder(
    [...BRAZE_CORE_WORKSTREAM_IDS],
    wsTopHex,
    wsBottomHex,
  );
  const defaultWorkstreamOrderJson = JSON.stringify(
    normalizeBrazeCoreWorkstreamOrder(undefined, defaultOrderRail),
  );

  await configs.insertOne({
    Config_ID: configId,
    Title: input.title,
    Product_Type: input.productType,
    Plan: input.planOptionId,
    Duration_Weeks: durationWeeks,
    Industry: input.industry,
    Password: resolvedPassword,
    Created_By: input.createdBy,
    Last_Saved: new Date().toISOString(),
    URL: "",
    customer_color: customerHex ?? "",
    onboarding_color: onboardingHex ?? "",
    workstream_color1: wsTopHex ?? "",
    workstream_color2: wsBottomHex ?? "",
    Workstream_Order: isBrazeCore ? defaultWorkstreamOrderJson : "",
    Button_Color: buttonHex ?? "",
    TimelineAnnotation: serializeTimelineAnnotationDocument(EMPTY_TIMELINE_ANNOTATION_DOC),
    chosen_title: "",
    logo_display_height_px: MAX_LOGO_DISPLAY_HEIGHT_PX,
    Channel_Email: Boolean(ch.email),
    Channel_SMS: Boolean(ch.sms),
    Channel_WhatsApp: Boolean(ch.whatsapp),
    Channel_InProduct: Boolean(ch.inProductMessaging),
    Timeline_Dates: serializeTimelineDates(input.timelineDates ?? []),
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
      Row_Span: Math.max(1, Math.round(Number(tile.Row_Span) || 1)),
      Category: tile.Category,
      Notes: "",
      Description: "",
      Attendees: "",
      Agenda: "",
      Resources: "",
      Desired_Outcomes: "",
    };
  });

  if (seedTiles.length > 0) {
    await tiles.insertMany(seedTiles);
  }
  await upsertConfigLogoDataUrl(configId, logoDataUrl);

  const created = await fetchConfigById(configId);
  if (!created) {
    throw new Error("Config was created but could not be reloaded.");
  }
  return created;
}

export async function duplicateConfig(sourceConfigId: string, createdBy: string): Promise<ConfigRecord> {
  const { configs, tiles } = await getMongoCollections();
  const source = await fetchConfigById(sourceConfigId);
  if (!source) {
    throw new Error(`Config not found: ${sourceConfigId}`);
  }
  const sourceTiles = await fetchTiles(sourceConfigId);

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

  const onboardingHex = parseHexColorOptional(source.onboardingSessionTileColor ?? "");
  const customerHex = parseHexColorOptional(source.customerActivityTileColor ?? "");
  const buttonHex = parseHexColorOptional(source.buttonColor ?? "");
  const wsTopHex = parseHexColorOptional(source.workstreamGradientTopColor ?? "");
  const wsBottomHex = parseHexColorOptional(source.workstreamGradientBottomColor ?? "");
  const sourceLogoDataUrl = normalizeLogoDataUrl(source.logoDataUrl);
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

  await configs.insertOne({
    Config_ID: configId,
    Title: dupTitle,
    Product_Type: source.Product_Type,
    Plan: source.planOptionId,
    Duration_Weeks: source.Duration_Weeks,
    Industry: source.Industry,
    Password: resolvedPassword,
    Created_By: createdBy,
    Last_Saved: new Date().toISOString(),
    URL: "",
    customer_color: customerHex ?? "",
    onboarding_color: onboardingHex ?? "",
    workstream_color1: wsTopHex ?? "",
    workstream_color2: wsBottomHex ?? "",
    Workstream_Order: isBrazeCore
      ? source.brazeCoreWorkstreamOrder?.length
        ? JSON.stringify(source.brazeCoreWorkstreamOrder)
        : defaultWorkstreamOrderJson
      : "",
    Button_Color: buttonHex ?? "",
    TimelineAnnotation: serializeTimelineAnnotationDocument(
      source.timelineAnnotation ?? EMPTY_TIMELINE_ANNOTATION_DOC,
    ),
    chosen_title: "",
    logo_display_height_px:
      normalizeLogoDisplayHeightPx(source.logoDisplayHeightPx) ?? MAX_LOGO_DISPLAY_HEIGHT_PX,
    Channel_Email: Boolean(ch.email),
    Channel_SMS: Boolean(ch.sms),
    Channel_WhatsApp: Boolean(ch.whatsapp),
    Channel_InProduct: Boolean(ch.inProductMessaging),
    Timeline_Dates: serializeTimelineDates(source.timelineDates ?? []),
  });

  const duplicateTiles = sourceTiles.map((t) => ({
    ID: compositeTileRowId(configId, t.Tile_ID),
    Title_ID: t.Tile_ID,
    Config_ID: configId,
    Workstream: t.Workstream,
    Title: t.Title,
    Start_Week: t.Start_Week,
    Span_Weeks: t.Span_Weeks,
    Stack_Order: t.Stack_Order,
    Row_Span: Math.max(1, Math.round(Number(t.Row_Span) || 1)),
    Category: t.Category,
    Notes: t.Notes ?? "",
    Description: t.Description ?? "",
    Attendees: t.Attendees ?? "",
    Agenda: t.Agenda ?? "",
    Resources: t.Resources ?? "",
    Desired_Outcomes: t.Desired_Outcomes ?? "",
  }));
  if (duplicateTiles.length > 0) {
    await tiles.insertMany(duplicateTiles);
  }
  await upsertConfigLogoDataUrl(configId, sourceLogoDataUrl);

  const created = await fetchConfigById(configId);
  if (!created) {
    throw new Error("Duplicate config was created but could not be reloaded.");
  }
  return created;
}

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
  const { tiles } = await getMongoCollections();

  await Promise.all(
    updates.map(async (update) => {
      const slug = String(update.Tile_ID ?? "").trim();
      if (!slug) return;
      const rowId = compositeTileRowId(configId, slug);
      const set: Record<string, unknown> = {
        Start_Week: update.Start_Week,
        Workstream: update.Workstream,
      };
      if (update.Notes !== undefined) set.Notes = update.Notes;
      if (update.Span_Weeks !== undefined) set.Span_Weeks = update.Span_Weeks;
      if (update.Title !== undefined) set.Title = update.Title;
      if (update.Description !== undefined) set.Description = update.Description;
      if (update.Agenda !== undefined) set.Agenda = update.Agenda;
      if (update.Attendees !== undefined) set.Attendees = update.Attendees;
      if (update.Resources !== undefined) set.Resources = update.Resources;
      if (update.Desired_Outcomes !== undefined) set.Desired_Outcomes = update.Desired_Outcomes;

      await tiles.updateOne(
        { Config_ID: configId, $or: [{ ID: rowId }, { Title_ID: slug }] },
        { $set: set },
      );
    }),
  );
}

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
    | "Row_Span"
    | "Category"
    | "Notes"
    | "Description"
  > &
    Partial<Pick<TileRecord, "Attendees" | "Agenda" | "Resources" | "Desired_Outcomes">>,
): Promise<void> {
  const { tiles } = await getMongoCollections();
  const slug = String(tile.Tile_ID ?? "").trim();
  if (!slug) throw new Error("createTileRow: Tile_ID is required.");
  await tiles.insertOne({
    ID: compositeTileRowId(configId, slug),
    Title_ID: slug,
    Config_ID: configId,
    Workstream: tile.Workstream,
    Title: tile.Title,
    Start_Week: tile.Start_Week,
    Span_Weeks: tile.Span_Weeks,
    Stack_Order: tile.Stack_Order,
    Row_Span: Math.max(1, Math.round(Number(tile.Row_Span) || 1)),
    Category: tile.Category,
    Notes: tile.Notes ?? "",
    Description: tile.Description ?? "",
    Attendees: tile.Attendees ?? "",
    Agenda: tile.Agenda ?? "",
    Resources: tile.Resources ?? "",
    Desired_Outcomes: tile.Desired_Outcomes ?? "",
  });
}

export async function replaceTilesForConfigSeed(input: {
  configId: string;
  productType: ProductType;
  planOptionId: PlanOptionId;
  channels: ConfigRecord["channels"];
}): Promise<number> {
  const { tiles } = await getMongoCollections();
  const { configId, productType, planOptionId, channels } = input;
  const seedTiles = (
    productType === "AI Decisioning Studio"
      ? getAiDecisioningStudioSeedTemplate()
      : getSeedTemplate(planOptionId).filter((tile) => {
          if (tile.Workstream === "email" && !channels.email) return false;
          if (tile.Workstream === "sms" && !channels.sms) return false;
          if (tile.Workstream === "whatsapp" && !channels.whatsapp) return false;
          return true;
        })
  ).map((tile) => {
    const slug = tile.Tile_ID;
    return {
      ID: compositeTileRowId(configId, slug),
      Title_ID: slug,
      Config_ID: configId,
      Workstream: tile.Workstream,
      Title: tile.Title,
      Start_Week: tile.Start_Week,
      Span_Weeks: tile.Span_Weeks,
      Stack_Order: tile.Stack_Order,
      Row_Span: Math.max(1, Math.round(Number(tile.Row_Span) || 1)),
      Category: tile.Category,
      Notes: "",
      Description: "",
      Attendees: "",
      Agenda: "",
      Resources: "",
      Desired_Outcomes: "",
    };
  });

  await tiles.deleteMany({ Config_ID: configId });
  if (seedTiles.length > 0) {
    await tiles.insertMany(seedTiles);
  }
  return seedTiles.length;
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
      | "logoDataUrl"
      | "logoDisplayHeightPx"
      | "brazeCoreWorkstreamOrder"
      | "timelineAnnotation"
      | "timelineDates"
    >
  >,
): Promise<void> {
  const { configs } = await getMongoCollections();
  const set: Record<string, unknown> = {
    Last_Saved: new Date().toISOString(),
  };
  if (updates.Title !== undefined) set.Title = updates.Title;
  if (updates.chosenTitle !== undefined) set.chosen_title = String(updates.chosenTitle).trim();
  if (updates.Product_Type !== undefined) set.Product_Type = updates.Product_Type;
  if (updates.Industry !== undefined) set.Industry = updates.Industry;
  if (updates.Password !== undefined) set.Password = updates.Password;
  if (updates.handoffDocUrl !== undefined) set.URL = updates.handoffDocUrl;
  if (updates.brazeCoreWorkstreamOrder !== undefined) {
    const railFallback = (ws: Workstream) =>
      WORKSTREAMS.find((w) => w.id === ws)?.color ?? "#300266";
    set.Workstream_Order = JSON.stringify(
      normalizeBrazeCoreWorkstreamOrder(updates.brazeCoreWorkstreamOrder, railFallback),
    );
  }
  if (updates.onboardingSessionTileColor !== undefined) {
    set.onboarding_color = parseHexColorOptional(updates.onboardingSessionTileColor) ?? "";
  }
  if (updates.customerActivityTileColor !== undefined) {
    set.customer_color = parseHexColorOptional(updates.customerActivityTileColor) ?? "";
  }
  if (updates.buttonColor !== undefined) {
    set.Button_Color = parseHexColorOptional(updates.buttonColor) ?? "";
  }
  if (updates.workstreamGradientTopColor !== undefined) {
    set.workstream_color1 = parseHexColorOptional(updates.workstreamGradientTopColor) ?? "";
  }
  if (updates.workstreamGradientBottomColor !== undefined) {
    set.workstream_color2 = parseHexColorOptional(updates.workstreamGradientBottomColor) ?? "";
  }
  if (updates.planOptionId !== undefined) {
    set.Plan = updates.planOptionId;
    set.Duration_Weeks = durationWeeksForPlanOption(updates.planOptionId);
  }
  if (updates.timelineAnnotation !== undefined) {
    set.TimelineAnnotation = serializeTimelineAnnotationDocument(updates.timelineAnnotation);
  }
  if (updates.timelineDates !== undefined) {
    set.Timeline_Dates = serializeTimelineDates(updates.timelineDates);
  }
  if (updates.logoDisplayHeightPx !== undefined) {
    set.logo_display_height_px =
      normalizeLogoDisplayHeightPx(updates.logoDisplayHeightPx) ?? MAX_LOGO_DISPLAY_HEIGHT_PX;
  }
  if (updates.Product_Type === "AI Decisioning Studio") {
    set.Plan = "ai_decisioning_studio";
    set.Duration_Weeks = AI_DECISIONING_STUDIO_TIMELINE_WEEKS;
  } else if (updates.Duration_Weeks !== undefined && updates.planOptionId === undefined) {
    set.Duration_Weeks = updates.Duration_Weeks;
  }

  const result = await configs.updateOne(
    { Config_ID: configId },
    { $set: set },
  );
  if (result.matchedCount === 0) {
    throw new Error(`Config not found: ${configId}`);
  }
  if (updates.logoDataUrl !== undefined) {
    const logoDataUrl = normalizeLogoDataUrl(updates.logoDataUrl);
    await upsertConfigLogoDataUrl(configId, logoDataUrl);
  }
}

export async function fetchTileDeleteKeysForConfig(configId: string): Promise<string[]> {
  const { tiles } = await getMongoCollections();
  const docs = await tiles
    .find({ Config_ID: configId }, { projection: { ID: 1, Title_ID: 1, Config_ID: 1 } })
    .toArray();
  const keys = docs
    .map((doc) => {
      const row = doc as unknown as Record<string, unknown>;
      const id = String(row.ID ?? "").trim();
      if (id) return id;
      const slug = String(row.Title_ID ?? "").trim();
      return slug ? compositeTileRowId(configId, slug) : "";
    })
    .filter((key) => key.length > 0);
  return Array.from(new Set(keys));
}

export async function deleteConfigOnly(configId: string): Promise<void> {
  const { configs, assets } = await getMongoCollections();
  await configs.deleteOne({ Config_ID: configId });
  await assets.deleteOne({ Config_ID: configId, Asset_Type: LOGO_ASSET_TYPE });
}

export async function deleteTilesByKeys(configId: string, tileRowKeys: string[]): Promise<number> {
  const { tiles } = await getMongoCollections();
  const keys = tileRowKeys.map((key) => key.trim()).filter((key) => key.length > 0);
  if (!keys.length) return 0;

  let removed = 0;
  const byId = await tiles.deleteMany({ Config_ID: configId, ID: { $in: keys } });
  removed += byId.deletedCount ?? 0;

  if (removed < keys.length) {
    const slugs = keys
      .map((key) => parseCompositeTileRowId(key).slug.trim())
      .filter((slug) => slug.length > 0);
    if (slugs.length > 0) {
      const bySlug = await tiles.deleteMany({ Config_ID: configId, Title_ID: { $in: slugs } });
      removed += bySlug.deletedCount ?? 0;
    }
  }

  return removed;
}

