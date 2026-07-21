import type { TimelineAnnotationDocument } from "./timeline-annotations";

export type TileCategory =
  | "onboarding_session"
  | "customer_activity"
  | "milestone";

/** Customer activity drawer: who leads the session (Mongo **Activity_Led**). */
export type CustomerActivityLed = "customer" | "partner";

export type Workstream =
  | "governance"
  | "data"
  | "tech"
  | "email"
  | "sms"
  | "whatsapp"
  | "campaign"
  | "enablement"
  /** Enterprise Platinum Gantt task-list section lanes (not used on swimlane). */
  | "gantt_admin"
  | "gantt_data"
  | "gantt_tech"
  | "gantt_audiences"
  | "gantt_channels"
  | "gantt_email"
  | "gantt_sms"
  | "gantt_whatsapp"
  | "gantt_web_mobile"
  | "gantt_messaging"
  | "gantt_analytics"
  /** AI Decisioning Studio canvas lanes (no swimlane labels; use JSON `Workstream`: `one`, `two`, …). */
  | "one"
  | "two"
  | "three"
  | "four";

/** Braze Core workstream rail label contrast (Caboodle **Workstream_Order** JSON). */
export type WorkstreamLabelTextType = "b" | "w";

export type BrazeWorkstreamOrderEntry = {
  workstream: Workstream;
  type: WorkstreamLabelTextType;
  /** Set when the user double-clicked a rail label to override auto contrast (persisted in Mongo). */
  labelContrastUserSet?: boolean;
};

export type ProductType = "Braze Core" | "AI Decisioning Studio";

export type IndustryType =
  | "Retail & eCommerce"
  | "QSR"
  | "Media, Gaming, and Entertainment"
  | "Financial Services"
  | "Healthcare & Life Sciences"
  | "Other";

export type PlanDurationWeeks = 6 | 12 | 16 | 18 | 20 | 24 | 40 | 48;

/** Named onboarding timeline product (maps to a week count for seed scaling). */
export type PlanOptionId =
  | "growth_silver"
  | "quickstart_silver"
  | "quickstart_gold"
  | "ignite_silver"
  | "ignite_gold"
  | "12_week"
  | "enterprise_gold"
  | "ai_decisioning_studio";

/** Messaging/channel scope for the onboarding plan (stored on config row). */
export type ChannelPreferences = {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  /** Stored for future use; does not filter canvas rows yet. */
  inProductMessaging: boolean;
};

export type ConfigRecord = {
  Config_ID: string;
  Title: string;
  /** Optional toolbar heading override from configs sheet `chosen_title`; when blank, UI falls back to computed plan heading. */
  chosenTitle?: string;
  /** Optional config logo (data URL) stored in Mongo `config_assets`; used on config timeline pages. */
  logoDataUrl?: string;
  /** Optional rendered logo height on config toolbar (px), clamped to <= 60. */
  logoDisplayHeightPx?: number;
  Product_Type: ProductType;
  Duration_Weeks: PlanDurationWeeks;
  /** Caboodle **Plan_Option** (slug); drives timeline label and week scaling. */
  planOptionId: PlanOptionId;
  Industry: IndustryType;
  Password: string;
  Created_By: string;
  Last_Saved?: string;
  UID?: string;
  /** From Caboodle GET when present; otherwise Config_ID. Used as PATCH/DELETE row key. */
  CaboodlePatchKey?: string;
  /** Last exported Google Doc URL for OM hand-off notes (Caboodle **URL** column when present). */
  handoffDocUrl?: string;
  /** Optional `#rrggbb` for onboarding-session tiles (swimlane + Gantt key / ADS bars). */
  onboardingSessionTileColor?: string;
  /** Optional `#rrggbb` for customer-activity tile fill (swimlane + Gantt key / ADS bars). */
  customerActivityTileColor?: string;
  /**
   * Optional `#rrggbb` for canvas toolbar actions (View Gantt / Swimlane, add tile, Save layout).
   * Caboodle configs sheet **Button_Color** (also reads legacy `button_color` / `buttonColor`).
   */
  buttonColor?: string;
  /** Braze Core: gradient start for visible workstream row rail / Gantt workstream hues (with {@link workstreamGradientBottomColor}). */
  workstreamGradientTopColor?: string;
  /** Braze Core: gradient end for visible workstream rows (last row). */
  workstreamGradientBottomColor?: string;
  /**
   * Braze Core: swimlane + Gantt row order + per-row label contrast (JSON on **Workstream_Order**).
   * Omitted or empty → default {@link WORKSTREAMS} order with algorithmic `type`.
   */
  brazeCoreWorkstreamOrder?: BrazeWorkstreamOrderEntry[];
  /** Caboodle **TimelineAnnotation** JSON: vertical timeline markers (swimlane + Gantt). */
  timelineAnnotation?: TimelineAnnotationDocument;
  /**
   * Caboodle **Timeline_Dates** — `[date1,date2,...]` with ISO dates.
   * Index 0 is the user start date; later values are +1 month or +1 week (Growth Silver).
   */
  timelineDates?: string[];
  channels: ChannelPreferences;
  /** When true, onboarding includes hands-on keyboard support (Mongo **Hands_On_Keyboard_Support**). */
  handsOnKeyboardSupport?: boolean;
  /** Optional partner name when {@link handsOnKeyboardSupport} is enabled (Mongo **Partner_Name**). */
  partnerName?: string;
};

export type TileRecord = {
  /** Content slug from constants; from sheet **Title_ID**, else legacy **Tile_ID**, else parsed from **ID**. */
  Tile_ID: string;
  /** Owning config id from tiles sheet **Config_ID**; if absent, parsed from composite **ID** prefix. */
  Config_ID: string;
  Workstream: Workstream;
  Title: string;
  Start_Week: number;
  Span_Weeks: number;
  /** Per-week vertical ordering from templates/caboodle (lower renders higher). */
  Stack_Order: number;
  /** Vertical lane height on swimlane views (1 = normal tile height, 2 = spans two lane rows). */
  Row_Span: number;
  Category: TileCategory;
  /** Tiles sheet **Notes** column (free text). */
  Notes?: string;
  /** Tiles sheet **Description** column; when empty, UI may fall back to tile library copy. */
  Description?: string;
  /** Tiles sheet **Suggested Attendees** (multiline / bullets). */
  Attendees?: string;
  /** Meetings tab **Agenda & Outcomes** (multiline / bullets). */
  Agenda_Outcomes?: string;
  /** Meetings tab **Related Tasks** (multiline / bullets). */
  Related_Tasks?: string;
  /**
   * Customer activity tiles when Hands On Keyboard Support is enabled.
   * Mongo **Activity_Led** (`customer` default, `partner` when partner-led).
   */
  activityLed?: CustomerActivityLed;
  /** Customer activity tiles: effort estimate (Mongo **Level_Of_Effort**). */
  Level_Of_Effort?: string;
  /** Tiles sheet **ID** column (`{Config_ID}__{Tile_ID slug}`) for PATCH/DELETE/`?id=`. */
  CaboodlePatchKey?: string;
  /** Enterprise Platinum Gantt (`ept_*` tiles): minimum bar span in timeline columns. */
  ganttMinSpanWeeks?: number;
  /** Enterprise Platinum Gantt: `Y` = user may delete the row. */
  ganttOptional?: "Y" | "N" | "";
};

/** Mongo `gantt_tasks` collection — Enterprise Platinum plan task rows (separate from swimlane tiles). */
export type GanttTaskRecord = {
  Config_ID: string;
  Task_Key: string;
  Tile_ID: string;
  Section: string;
  Workstream: Workstream;
  Title: string;
  Optional: "Y" | "N";
  Start_Week: number;
  Span_Weeks: number;
  Min_Span_Weeks: number;
  Stack_Order: number;
  Description?: string;
  Attendees?: string;
  Agenda_Outcomes?: string;
  Related_Tasks?: string;
  Level_Of_Effort?: string;
  Notes?: string;
  CaboodlePatchKey?: string;
};

export type TileLibraryLink = { label: string; url: string };

/** Static drawer content per tile slug. All keys are always present (arrays may be empty). */
export type TileLibraryEntry = {
  description: string;
  agenda: string[];
  suggested_attendees: string[];
  desired_outcomes: string[];
  resources: TileLibraryLink[];
  customer_examples: TileLibraryLink[];
  /** Milestone tiles — shown instead of agenda/attendees/outcomes/resources/examples in the drawer. */
  success_checklist: string[];
  strategic_impact: string[];
};
