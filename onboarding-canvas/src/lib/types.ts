export type TileCategory =
  | "onboarding_session"
  | "customer_activity"
  | "milestone";

export type Workstream =
  | "governance"
  | "data"
  | "tech"
  | "email"
  | "sms"
  | "whatsapp"
  | "campaign"
  | "enablement"
  /** AI Decisioning Studio canvas lanes (no swimlane labels; use JSON `Workstream`: `one`, `two`, …). */
  | "one"
  | "two"
  | "three"
  | "four";

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
  channels: ChannelPreferences;
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
  Category: TileCategory;
  /** Tiles sheet **Notes** column (free text). */
  Notes?: string;
  /** Tiles sheet **Description** column; when empty, UI may fall back to tile library copy. */
  Description?: string;
  /** Tiles sheet **Attendees** (multiline / bullets). When empty, drawer uses tile library suggested attendees. */
  Attendees?: string;
  /** Tiles sheet **Resources** (multiline). When empty, drawer uses tile library resource links. */
  Resources?: string;
  /** Tiles sheet **Desired_Outcomes** (multiline / bullets). When empty, drawer uses library outcomes. */
  Desired_Outcomes?: string;
  /** Tiles sheet **ID** column (`{Config_ID}__{Tile_ID slug}`) for PATCH/DELETE/`?id=`. */
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
