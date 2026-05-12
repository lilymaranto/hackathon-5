import { PlanOptionId, TileRecord } from "@/lib/types";

type SeedTemplateTile = Omit<TileRecord, "Config_ID" | "CaboodlePatchKey">;
type SeedTemplateTileInput = Omit<SeedTemplateTile, "Stack_Order"> & {
  Stack_Order?: number;
};

export type TimelineBand = { name: string; span: number };
export type TimelineConfig = {
  phases: TimelineBand[];
  months: TimelineBand[];
};

/** Ignite Gold canvas: each month band uses this many grid columns (week-based data maps into the grid). */
export const IGNITE_GOLD_COLUMNS_PER_MONTH = 4;

/**
 * **8** grid columns per month × **3** months (24 total). Used by Quickstart Gold and Quickstart Silver canvases.
 * @see `QUICKSTART_GOLD_TIMELINE_COLUMNS`
 */
export const QUICKSTART_GOLD_COLUMNS_PER_MONTH = 8;
export const QUICKSTART_GOLD_MONTH_COUNT = 3;
export const QUICKSTART_GOLD_TIMELINE_COLUMNS =
  QUICKSTART_GOLD_COLUMNS_PER_MONTH * QUICKSTART_GOLD_MONTH_COUNT;

/** Ignite Silver canvas: **8** columns × **5** months (= **40** timeline columns; week-based tiles). */
export const IGNITE_SILVER_COLUMNS_PER_MONTH = 8;
export const IGNITE_SILVER_MONTH_COUNT = 5;
export const IGNITE_SILVER_TIMELINE_COLUMNS =
  IGNITE_SILVER_COLUMNS_PER_MONTH * IGNITE_SILVER_MONTH_COUNT;

/** Enterprise Platinum (`12_week`): **8** columns × **6** months (= **48** timeline units). */
export const ENTERPRISE_PLATINUM_COLUMNS_PER_MONTH = 8;
export const ENTERPRISE_PLATINUM_MONTH_COUNT = 6;
export const ENTERPRISE_PLATINUM_TIMELINE_COLUMNS =
  ENTERPRISE_PLATINUM_COLUMNS_PER_MONTH * ENTERPRISE_PLATINUM_MONTH_COUNT;

function withDefaultStackOrder(tiles: SeedTemplateTileInput[]): SeedTemplateTile[] {
  const counters = new Map<string, number>();
  return tiles.map((tile) => {
    if (typeof tile.Stack_Order === "number" && tile.Stack_Order > 0) {
      const key = `${tile.Workstream}::${tile.Start_Week}`;
      counters.set(key, Math.max(counters.get(key) ?? 0, tile.Stack_Order));
      return { ...tile, Stack_Order: tile.Stack_Order };
    }

    const key = `${tile.Workstream}::${tile.Start_Week}`;
    const nextOrder = (counters.get(key) ?? 0) + 1;
    counters.set(key, nextOrder);
    return { ...tile, Stack_Order: nextOrder };
  });
}

/**
 * Growth Silver timeline is a fine-grained subgrid (**8** columns per logical week × plan weeks). Those positions are stored in
 * `Start_Week` / `Span_Weeks` for Caboodle compatibility — values are **column indices/spans**, not calendar weeks.
 */
const GROWTH_SILVER_TEMPLATE: SeedTemplateTile[] = withDefaultStackOrder([
    { "Tile_ID": "weekly_alignment", "Workstream": "governance", "Title": "Weekly Project Management Alignment Calls", "Start_Week": 1, "Span_Weeks": 48, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "project_kick_off", "Workstream": "governance", "Title": "Project Kick-Off", "Start_Week": 1, "Span_Weeks": 3, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "setup_gov_security", "Workstream": "governance", "Title": "Setup Governance & Security", "Start_Week": 4, "Span_Weeks": 3, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "dashboard_complete", "Workstream": "governance", "Title": "Dashboard Setup Complete", "Start_Week": 7, "Span_Weeks": 6, "Stack_Order": 2, "Category": "milestone" },
    
    { "Tile_ID": "data_planning_workshops", "Workstream": "data", "Title": "Campaign & Data Planning Workshops", "Start_Week": 1, "Span_Weeks": 13, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "data_planning_task", "Workstream": "data", "Title": "Campaign & Data Planning", "Start_Week": 1, "Span_Weeks": 13, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "data_planning_complete", "Workstream": "data", "Title": "Campaign and Data Planning Complete", "Start_Week": 14, "Span_Weeks": 6, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "tech_overview", "Workstream": "tech", "Title": "Tech Overview", "Start_Week": 11, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "external_id_logic", "Workstream": "tech", "Title": "Define External ID Logic", "Start_Week": 9, "Span_Weeks": 8, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "sdk_deep_dive", "Workstream": "tech", "Title": "SDK Deep Dive", "Start_Week": 14, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "api_deep_dive", "Workstream": "tech", "Title": "API Deep Dive", "Start_Week": 17, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "integrate_sdks_apis", "Workstream": "tech", "Title": "Integrate & QA SDKs & APIs", "Start_Week": 17, "Span_Weeks": 7, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "user_data_import", "Workstream": "tech", "Title": "Import User Data & Subscription States", "Start_Week": 17, "Span_Weeks": 8, "Stack_Order": 3, "Category": "customer_activity" },
    { "Tile_ID": "mobile_web_channels", "Workstream": "tech", "Title": "Setup Mobile/Web Channels", "Start_Week": 24, "Span_Weeks": 7, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "data_exports", "Workstream": "tech", "Title": "Setup Data Exports", "Start_Week": 25, "Span_Weeks": 5, "Stack_Order": 3, "Category": "customer_activity" },
    { "Tile_ID": "tech_int_complete", "Workstream": "tech", "Title": "Tech Integration Complete", "Start_Week": 31, "Span_Weeks": 5, "Stack_Order": 2, "Category": "milestone" },
  
    { "Tile_ID": "build_launch_phase_1", "Workstream": "campaign", "Title": "Build and Launch Phase 1 Use Cases", "Start_Week": 30, "Span_Weeks": 14, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "journeys_live", "Workstream": "campaign", "Title": "Multi Channel Journeys Live", "Start_Week": 44, "Span_Weeks": 5, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "email_discovery_session", "Workstream": "email", "Title": "Email Discovery Workshop", "Start_Week": 1, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "email_config", "Workstream": "email", "Title": "Setup Email Config (DNS & SSL)", "Start_Week": 4, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "email_templates", "Workstream": "email", "Title": "Build Email Templates", "Start_Week": 7, "Span_Weeks": 14, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ip_warming_plan", "Workstream": "email", "Title": "Plan IP Warming", "Start_Week": 7, "Span_Weeks": 14, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "pre_ip_warming", "Workstream": "email", "Title": "Pre IP Warming Workshop", "Start_Week": 21, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "launch_ip_warming", "Workstream": "email", "Title": "Launch IP Warming", "Start_Week": 24, "Span_Weeks": 11, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "email_setup_complete", "Workstream": "email", "Title": "Email Setup Complete", "Start_Week": 35, "Span_Weeks": 5, "Stack_Order": 2, "Category": "milestone" },
  
    { "Tile_ID": "sms_discovery_session", "Workstream": "sms", "Title": "SMS Discovery Workshop", "Start_Week": 1, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "test_long_code", "Workstream": "sms", "Title": "Test Long Code Secured", "Start_Week": 4, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sms_sender_app", "Workstream": "sms", "Title": "Prepare Sender Application (incl. SMS Opt-in Flow Review)", "Start_Week": 7, "Span_Weeks": 5, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "sms_approval_process", "Workstream": "sms", "Title": "Additional Sender Approval Process (Timeline Dependent on SMS Scope)", "Start_Week": 12, "Span_Weeks": 31, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "sms_enablement", "Workstream": "sms", "Title": "SMS Enablement", "Start_Week": 33, "Span_Weeks": 5, "Stack_Order": 3, "Category": "onboarding_session" },
    { "Tile_ID": "qa_test_sms", "Workstream": "sms", "Title": "QA & Test SMS", "Start_Week": 38, "Span_Weeks": 5, "Stack_Order": 3, "Category": "customer_activity" },
    { "Tile_ID": "sms_setup_complete", "Workstream": "sms", "Title": "SMS Setup Complete", "Start_Week": 43, "Span_Weeks": 6, "Stack_Order": 2, "Category": "milestone" },
  
    { "Tile_ID": "whatsapp_discovery", "Workstream": "whatsapp", "Title": "WhatsApp Discovery Workshop", "Start_Week": 8, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "waba_walkthrough", "Workstream": "whatsapp", "Title": "WABA Process Walkthrough", "Start_Week": 11, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "acquire_waba", "Workstream": "whatsapp", "Title": "Acquire WABA", "Start_Week": 14, "Span_Weeks": 6, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_optin_campaign", "Workstream": "whatsapp", "Title": "Build & Launch Opt-in Campaign", "Start_Week": 20, "Span_Weeks": 9, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_templates", "Workstream": "whatsapp", "Title": "Build WA Templates in WA Manager", "Start_Week": 20, "Span_Weeks": 9, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "whatsapp_complete", "Workstream": "whatsapp", "Title": "WhatsApp Setup Complete", "Start_Week": 29, "Span_Weeks": 6, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "live_foundations", "Workstream": "enablement", "Title": "Complete Live Foundations Courses", "Start_Week": 1, "Span_Weeks": 14, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ondemand_learning", "Workstream": "enablement", "Title": "Complete On-Demand Braze Learning Courses", "Start_Week": 15, "Span_Weeks": 15, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "advanced_training", "Workstream": "enablement", "Title": "Attend Live Advanced Instructor Led Training Sessions", "Start_Week": 30, "Span_Weeks": 14, "Stack_Order": 1, "Category": "customer_activity" }
]);

/**
 * Quickstart Silver (`quickstart_silver`, 24-week plan; canvas **8 columns × 3 months**). Paste tile rows as JSON inside the array below.
 */
const QUICKSTART_SILVER_TEMPLATE: SeedTemplateTile[] = withDefaultStackOrder([
    { "Tile_ID": "weekly_alignment", "Workstream": "governance", "Title": "Weekly Project Management Alignment Calls", "Start_Week": 1, "Span_Weeks": 24, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "project_kick_off", "Workstream": "governance", "Title": "Project Kick-Off", "Start_Week": 1, "Span_Weeks": 2, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "setup_gov_security", "Workstream": "governance", "Title": "Setup Governance & Security", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "dashboard_complete", "Workstream": "governance", "Title": "Dashboard Setup Complete", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 2, "Category": "milestone" },
    
    { "Tile_ID": "data_planning_workshops", "Workstream": "data", "Title": "Campaign & Data Planning Workshops", "Start_Week": 1, "Span_Weeks": 6, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "data_planning_task", "Workstream": "data", "Title": "Campaign & Data Planning", "Start_Week": 1, "Span_Weeks": 6, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "data_planning_complete", "Workstream": "data", "Title": "Campaign and Data Planning Complete", "Start_Week": 7, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "tech_overview", "Workstream": "tech", "Title": "Tech Overview", "Start_Week": 6, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sdk_deep_dive", "Workstream": "tech", "Title": "SDK Deep Dive", "Start_Week": 7, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "api_deep_dive", "Workstream": "tech", "Title": "API Deep Dive", "Start_Week": 8, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "external_id_logic", "Workstream": "tech", "Title": "Define External ID Logic", "Start_Week": 6, "Span_Weeks": 3, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "integrate_sdks_apis", "Workstream": "tech", "Title": "Integrate & QA SDKs & APIs", "Start_Week": 9, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "user_data_import", "Workstream": "tech", "Title": "Import User Data & Subscription States", "Start_Week": 9, "Span_Weeks": 4, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "mobile_web_channels", "Workstream": "tech", "Title": "Setup Mobile/Web Channels", "Start_Week": 12, "Span_Weeks": 4, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "data_exports", "Workstream": "tech", "Title": "Setup Data Exports", "Start_Week": 13, "Span_Weeks": 3, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "tech_int_complete", "Workstream": "tech", "Title": "Tech Integration Complete", "Start_Week": 16, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "build_launch_phase_1", "Workstream": "campaign", "Title": "Build and Launch Phase 1 Use Cases", "Start_Week": 12, "Span_Weeks": 6, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "journeys_live", "Workstream": "campaign", "Title": "Multi Channel Journeys Live", "Start_Week": 18, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
    { "Tile_ID": "launch_phase_2", "Workstream": "campaign", "Title": "Launch Phase 2 Use Cases (Optional)", "Start_Week": 20, "Span_Weeks": 5, "Stack_Order": 1, "Category": "customer_activity" },
  
    { "Tile_ID": "email_discovery_session", "Workstream": "email", "Title": "Email Discovery Workshop", "Start_Week": 2, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "email_config", "Workstream": "email", "Title": "Setup Email Config (DNS & SSL)", "Start_Week": 4, "Span_Weeks": 2, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "email_templates", "Workstream": "email", "Title": "Build Email Templates", "Start_Week": 6, "Span_Weeks": 5, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ip_warming_plan", "Workstream": "email", "Title": "Plan IP Warming", "Start_Week": 6, "Span_Weeks": 5, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "pre_ip_warming", "Workstream": "email", "Title": "Pre IP Warming Workshop", "Start_Week": 11, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "launch_ip_warming", "Workstream": "email", "Title": "Launch IP Warming", "Start_Week": 13, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "email_setup_complete", "Workstream": "email", "Title": "Email Setup Complete", "Start_Week": 16, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "sms_discovery_session", "Workstream": "sms", "Title": "SMS Discovery Workshop", "Start_Week": 1, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "test_long_code", "Workstream": "sms", "Title": "Test Long Code Secured", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sms_sender_app", "Workstream": "sms", "Title": "Prepare Sender Application (incl. SMS Opt-in Flow Review)", "Start_Week": 5, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "sms_approval_process", "Workstream": "sms", "Title": "Additional Sender Approval Process (Timeline Dependent on SMS Scope)", "Start_Week": 8, "Span_Weeks": 10, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sms_enablement", "Workstream": "sms", "Title": "SMS Enablement", "Start_Week": 12, "Span_Weeks": 3, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "qa_test_sms", "Workstream": "sms", "Title": "QA & Test SMS", "Start_Week": 15, "Span_Weeks": 3, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "sms_setup_complete", "Workstream": "sms", "Title": "SMS Setup Complete", "Start_Week": 18, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "whatsapp_discovery", "Workstream": "whatsapp", "Title": "WhatsApp Discovery Workshop", "Start_Week": 4, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "waba_walkthrough", "Workstream": "whatsapp", "Title": "WABA Process Walkthrough", "Start_Week": 6, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "acquire_waba", "Workstream": "whatsapp", "Title": "Acquire WABA", "Start_Week": 8, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_optin_campaign", "Workstream": "whatsapp", "Title": "Build & Launch Opt-in Campaign", "Start_Week": 11, "Span_Weeks": 4, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_templates", "Workstream": "whatsapp", "Title": "Build WA Templates in WA Manager", "Start_Week": 11, "Span_Weeks": 4, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "whatsapp_complete", "Workstream": "whatsapp", "Title": "WhatsApp Setup Complete", "Start_Week": 15, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "live_foundations", "Workstream": "enablement", "Title": "Complete Live Foundations Courses", "Start_Week": 1, "Span_Weeks": 7, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ondemand_learning", "Workstream": "enablement", "Title": "Complete On-Demand Braze Learning Courses", "Start_Week": 8, "Span_Weeks": 8, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "advanced_training", "Workstream": "enablement", "Title": "Attend Live Advanced Instructor Led Training Sessions", "Start_Week": 16, "Span_Weeks": 7, "Stack_Order": 1, "Category": "customer_activity" }
  
]);

/**
 * Ignite Silver (`ignite_silver`, 40-week plan; canvas **8 columns × 5 months**). Paste tile rows as JSON inside the array below.
 */
const IGNITE_SILVER_TEMPLATE: SeedTemplateTile[] = withDefaultStackOrder([
    { "Tile_ID": "weekly_alignment", "Workstream": "governance", "Title": "Weekly Project Management Alignment Calls", "Start_Week": 1, "Span_Weeks": 40, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "project_kick_off", "Workstream": "governance", "Title": "Project Kick-Off", "Start_Week": 1, "Span_Weeks": 2, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "setup_gov_security", "Workstream": "governance", "Title": "Setup Governance & Security", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "dashboard_complete", "Workstream": "governance", "Title": "Dashboard Setup Complete", "Start_Week": 5, "Span_Weeks": 4, "Stack_Order": 2, "Category": "milestone" },
    
    { "Tile_ID": "data_planning_workshops", "Workstream": "data", "Title": "Campaign & Data Planning Workshops", "Start_Week": 1, "Span_Weeks": 8, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "data_planning_task", "Workstream": "data", "Title": "Campaign & Data Planning", "Start_Week": 1, "Span_Weeks": 8, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "data_planning_complete", "Workstream": "data", "Title": "Campaign and Data Planning Complete", "Start_Week": 9, "Span_Weeks": 4, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "tech_overview", "Workstream": "tech", "Title": "Tech Overview", "Start_Week": 6, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sdk_deep_dive", "Workstream": "tech", "Title": "SDK Deep Dive", "Start_Week": 7, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "api_deep_dive", "Workstream": "tech", "Title": "API Deep Dive", "Start_Week": 8, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "qa_testing", "Workstream": "tech", "Title": "QA & Testing", "Start_Week": 9, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "external_id_logic", "Workstream": "tech", "Title": "Define External ID Logic", "Start_Week": 6, "Span_Weeks": 3, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "integrate_sdks_apis", "Workstream": "tech", "Title": "Integrate & QA SDKs & APIs", "Start_Week": 10, "Span_Weeks": 6, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "user_data_import", "Workstream": "tech", "Title": "Import User Data & Subscription States", "Start_Week": 9, "Span_Weeks": 8, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "mobile_web_channels", "Workstream": "tech", "Title": "Setup Mobile/Web Channels", "Start_Week": 16, "Span_Weeks": 6, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "data_exports", "Workstream": "tech", "Title": "Setup Data Exports", "Start_Week": 17, "Span_Weeks": 5, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "tech_int_complete", "Workstream": "tech", "Title": "Tech Integration Complete", "Start_Week": 22, "Span_Weeks": 4, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "build_launch_phase_1", "Workstream": "campaign", "Title": "Build and Launch Phase 1 Use Cases", "Start_Week": 16, "Span_Weeks": 11, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "journeys_live", "Workstream": "campaign", "Title": "Multi Channel Journeys Live", "Start_Week": 27, "Span_Weeks": 3, "Stack_Order": 1, "Category": "milestone" },
    { "Tile_ID": "launch_phase_2", "Workstream": "campaign", "Title": "Launch Phase 2 Use Cases (Optional)", "Start_Week": 30, "Span_Weeks": 12, "Stack_Order": 1, "Category": "customer_activity" },
  
    { "Tile_ID": "email_discovery_session", "Workstream": "email", "Title": "Email Discovery Workshop", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "email_config", "Workstream": "email", "Title": "Setup Email Config (DNS & SSL)", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "email_templates", "Workstream": "email", "Title": "Build Email Templates", "Start_Week": 7, "Span_Weeks": 7, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ip_warming_plan", "Workstream": "email", "Title": "Plan IP Warming", "Start_Week": 7, "Span_Weeks": 7, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "pre_ip_warming", "Workstream": "email", "Title": "Pre IP Warming Workshop", "Start_Week": 14, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "launch_ip_warming", "Workstream": "email", "Title": "Launch IP Warming", "Start_Week": 17, "Span_Weeks": 5, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "email_setup_complete", "Workstream": "email", "Title": "Email Setup Complete", "Start_Week": 22, "Span_Weeks": 4, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "sms_discovery_session", "Workstream": "sms", "Title": "SMS Discovery Workshop", "Start_Week": 1, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "test_long_code", "Workstream": "sms", "Title": "Test Long Code Secured", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sms_sender_app", "Workstream": "sms", "Title": "Prepare Sender Application (incl. SMS Opt-in Flow Review)", "Start_Week": 5, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "sms_approval_process", "Workstream": "sms", "Title": "Additional Sender Approval Process (Timeline Dependent on SMS Scope)", "Start_Week": 8, "Span_Weeks": 17, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sms_enablement", "Workstream": "sms", "Title": "SMS Enablement", "Start_Week": 15, "Span_Weeks": 5, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "qa_test_sms", "Workstream": "sms", "Title": "QA & Test SMS", "Start_Week": 20, "Span_Weeks": 5, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "sms_setup_complete", "Workstream": "sms", "Title": "SMS Setup Complete", "Start_Week": 25, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "whatsapp_discovery", "Workstream": "whatsapp", "Title": "WhatsApp Discovery Workshop", "Start_Week": 4, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "waba_walkthrough", "Workstream": "whatsapp", "Title": "WABA Process Walkthrough", "Start_Week": 6, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "acquire_waba", "Workstream": "whatsapp", "Title": "Acquire WABA", "Start_Week": 8, "Span_Weeks": 5, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_optin_campaign", "Workstream": "whatsapp", "Title": "Build & Launch Opt-in Campaign", "Start_Week": 13, "Span_Weeks": 8, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_templates", "Workstream": "whatsapp", "Title": "Build WA Templates in WA Manager", "Start_Week": 13, "Span_Weeks": 8, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "whatsapp_complete", "Workstream": "whatsapp", "Title": "WhatsApp Setup Complete", "Start_Week": 21, "Span_Weeks": 4, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "live_foundations", "Workstream": "enablement", "Title": "Complete Live Foundations Courses", "Start_Week": 1, "Span_Weeks": 12, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ondemand_learning", "Workstream": "enablement", "Title": "Complete On-Demand Braze Learning Courses", "Start_Week": 13, "Span_Weeks": 12, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "advanced_training", "Workstream": "enablement", "Title": "Attend Live Advanced Instructor Led Training Sessions", "Start_Week": 25, "Span_Weeks": 12, "Stack_Order": 1, "Category": "customer_activity" }
]);

/** Ignite Gold: week-based seed (20-week plan, 5×4 weeks; canvas = 20 columns). aligns with `changes.md`. */
const IGNITE_GOLD_TEMPLATE: SeedTemplateTile[] = withDefaultStackOrder([
    { "Tile_ID": "weekly_alignment", "Workstream": "governance", "Title": "Weekly Project Management Alignment Calls", "Start_Week": 1, "Span_Weeks": 20, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "project_kick_off", "Workstream": "governance", "Title": "Project Kick-Off", "Start_Week": 1, "Span_Weeks": 1, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "platform_gov_security", "Workstream": "governance", "Title": "Platform Governance & Security", "Start_Week": 2, "Span_Weeks": 1, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "project_workbook", "Workstream": "governance", "Title": "Project Workbook Walkthrough", "Start_Week": 3, "Span_Weeks": 1, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "setup_gov_security", "Workstream": "governance", "Title": "Setup Governance & Security", "Start_Week": 4, "Span_Weeks": 1, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "dashboard_complete", "Workstream": "governance", "Title": "Dashboard Setup Complete", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 2, "Category": "milestone" },
    
    { "Tile_ID": "data_planning_workshops", "Workstream": "data", "Title": "Campaign & Data Planning Workshops", "Start_Week": 1, "Span_Weeks": 4, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "data_planning_task", "Workstream": "data", "Title": "Campaign & Data Planning", "Start_Week": 1, "Span_Weeks": 4, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "data_planning_complete", "Workstream": "data", "Title": "Campaign and Data Planning Complete", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "tech_overview", "Workstream": "tech", "Title": "Tech Overview", "Start_Week": 3, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sdk_deep_dive", "Workstream": "tech", "Title": "SDK Deep Dive", "Start_Week": 4, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "reporting_analytics", "Workstream": "tech", "Title": "Reporting & Analytics", "Start_Week": 5, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "api_deep_dive", "Workstream": "tech", "Title": "API Deep Dive", "Start_Week": 6, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "qa_testing", "Workstream": "tech", "Title": "QA & Testing", "Start_Week": 7, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "external_id_logic", "Workstream": "tech", "Title": "Define External ID Logic", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "weekly_office_hours", "Workstream": "tech", "Title": "Weekly Office Hours (Optional)", "Start_Week": 5, "Span_Weeks": 7, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "integrate_sdks_apis", "Workstream": "tech", "Title": "Integrate & QA SDKs & APIs", "Start_Week": 5, "Span_Weeks": 3, "Stack_Order": 3, "Category": "customer_activity" },
    { "Tile_ID": "user_data_import", "Workstream": "tech", "Title": "Import User Data & Subscription States", "Start_Week": 5, "Span_Weeks": 4, "Stack_Order": 4, "Category": "customer_activity" },
    { "Tile_ID": "mobile_web_channels", "Workstream": "tech", "Title": "Setup Mobile/Web Channels", "Start_Week": 8, "Span_Weeks": 4, "Stack_Order": 3, "Category": "customer_activity" },
    { "Tile_ID": "data_exports", "Workstream": "tech", "Title": "Setup Data Exports", "Start_Week": 9, "Span_Weeks": 3, "Stack_Order": 4, "Category": "customer_activity" },
    { "Tile_ID": "tech_int_complete", "Workstream": "tech", "Title": "Tech Integration Complete", "Start_Week": 12, "Span_Weeks": 2, "Stack_Order": 2, "Category": "milestone" },
  
    { "Tile_ID": "build_launch_phase_1", "Workstream": "campaign", "Title": "Build and Launch Phase 1 Use Cases", "Start_Week": 8, "Span_Weeks": 6, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "journeys_live", "Workstream": "campaign", "Title": "Multi Channel Journeys Live", "Start_Week": 14, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
    { "Tile_ID": "launch_phase_2", "Workstream": "campaign", "Title": "Launch Phase 2 Use Cases (Optional)", "Start_Week": 16, "Span_Weeks": 5, "Stack_Order": 1, "Category": "customer_activity" },
  
    { "Tile_ID": "email_discovery_session", "Workstream": "email", "Title": "Email Discovery Workshop", "Start_Week": 2, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "email_config", "Workstream": "email", "Title": "Setup Email Config (DNS & SSL)", "Start_Week": 3, "Span_Weeks": 1, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "email_templates", "Workstream": "email", "Title": "Build Email Templates", "Start_Week": 4, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ip_warming_plan", "Workstream": "email", "Title": "Plan IP Warming", "Start_Week": 4, "Span_Weeks": 3, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "pre_ip_warming", "Workstream": "email", "Title": "Pre IP Warming Workshop", "Start_Week": 7, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "launch_ip_warming", "Workstream": "email", "Title": "Launch IP Warming", "Start_Week": 8, "Span_Weeks": 3, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "email_setup_complete", "Workstream": "email", "Title": "Email Setup Complete", "Start_Week": 11, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "sms_discovery_session", "Workstream": "sms", "Title": "SMS Discovery Workshop", "Start_Week": 1, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "test_long_code", "Workstream": "sms", "Title": "Test Long Code Secured", "Start_Week": 2, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sms_sender_app", "Workstream": "sms", "Title": "Prepare Sender Application (incl. SMS Opt-in Flow Review)", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "sms_approval_process", "Workstream": "sms", "Title": "Additional Sender Approval Process (Timeline Dependent on SMS Scope)", "Start_Week": 5, "Span_Weeks": 8, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "sms_enablement", "Workstream": "sms", "Title": "SMS Enablement", "Start_Week": 9, "Span_Weeks": 2, "Stack_Order": 3, "Category": "onboarding_session" },
    { "Tile_ID": "qa_test_sms", "Workstream": "sms", "Title": "QA & Test SMS", "Start_Week": 11, "Span_Weeks": 2, "Stack_Order": 3, "Category": "customer_activity" },
    { "Tile_ID": "sms_setup_complete", "Workstream": "sms", "Title": "SMS Setup Complete", "Start_Week": 13, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "whatsapp_discovery", "Workstream": "whatsapp", "Title": "WhatsApp Discovery Workshop", "Start_Week": 3, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "waba_walkthrough", "Workstream": "whatsapp", "Title": "WABA Process Walkthrough", "Start_Week": 4, "Span_Weeks": 1, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "acquire_waba", "Workstream": "whatsapp", "Title": "Acquire WABA", "Start_Week": 5, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_optin_campaign", "Workstream": "whatsapp", "Title": "Build & Launch Opt-in Campaign", "Start_Week": 8, "Span_Weeks": 5, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_templates", "Workstream": "whatsapp", "Title": "Build WA Templates in WA Manager", "Start_Week": 8, "Span_Weeks": 5, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "whatsapp_complete", "Workstream": "whatsapp", "Title": "WhatsApp Setup Complete", "Start_Week": 13, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "live_foundations", "Workstream": "enablement", "Title": "Complete Live Foundations Courses", "Start_Week": 1, "Span_Weeks": 4, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ondemand_learning", "Workstream": "enablement", "Title": "Complete On-Demand Braze Learning Courses", "Start_Week": 5, "Span_Weeks": 7, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "advanced_training", "Workstream": "enablement", "Title": "Attend Live Advanced Instructor Led Training Sessions", "Start_Week": 12, "Span_Weeks": 6, "Stack_Order": 1, "Category": "customer_activity" }
]);

/**
 * Quickstart Gold (`quickstart_gold`). Canvas grid is **8 columns × 3 months** (`QUICKSTART_GOLD_TIMELINE_COLUMNS` = 24).
 * Each column maps to one plan week (same idea as Ignite Gold), clamped by config `Duration_Weeks` and the 24-column grid.
 * Same fields as other templates (`Tile_ID`, `Workstream`, `Title`, `Start_Week`, `Span_Weeks`, optional `Stack_Order`, `Category`).
 */
const QUICKSTART_GOLD_TEMPLATE: SeedTemplateTile[] = withDefaultStackOrder([
    { "Tile_ID": "weekly_alignment", "Workstream": "governance", "Title": "Weekly Project Management Alignment Calls", "Start_Week": 1, "Span_Weeks": 24, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "project_kick_off", "Workstream": "governance", "Title": "Project Kick-Off", "Start_Week": 1, "Span_Weeks": 2, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "platform_gov_security", "Workstream": "governance", "Title": "Platform Governance & Security", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "project_workbook", "Workstream": "governance", "Title": "Project Workbook Walkthrough", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "setup_gov_security", "Workstream": "governance", "Title": "Setup Governance & Security", "Start_Week": 7, "Span_Weeks": 2, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "dashboard_complete", "Workstream": "governance", "Title": "Dashboard Setup Complete", "Start_Week": 9, "Span_Weeks": 2, "Stack_Order": 2, "Category": "milestone" },
    
    { "Tile_ID": "data_planning_workshops", "Workstream": "data", "Title": "Campaign & Data Planning Workshops", "Start_Week": 1, "Span_Weeks": 8, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "data_planning_task", "Workstream": "data", "Title": "Campaign & Data Planning", "Start_Week": 1, "Span_Weeks": 8, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "data_planning_complete", "Workstream": "data", "Title": "Campaign and Data Planning Complete", "Start_Week": 9, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "tech_overview", "Workstream": "tech", "Title": "Tech Overview", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sdk_deep_dive", "Workstream": "tech", "Title": "SDK Deep Dive", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "reporting_analytics", "Workstream": "tech", "Title": "Reporting & Analytics", "Start_Week": 7, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "api_deep_dive", "Workstream": "tech", "Title": "API Deep Dive", "Start_Week": 9, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "qa_testing", "Workstream": "tech", "Title": "QA & Testing", "Start_Week": 11, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "external_id_logic", "Workstream": "tech", "Title": "Define External ID Logic", "Start_Week": 3, "Span_Weeks": 4, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "weekly_office_hours", "Workstream": "tech", "Title": "Weekly Office Hours (Optional)", "Start_Week": 7, "Span_Weeks": 8, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "integrate_sdks_apis", "Workstream": "tech", "Title": "Integrate & QA SDKs & APIs", "Start_Week": 7, "Span_Weeks": 4, "Stack_Order": 3, "Category": "customer_activity" },
    { "Tile_ID": "user_data_import", "Workstream": "tech", "Title": "Import User Data & Subscription States", "Start_Week": 7, "Span_Weeks": 5, "Stack_Order": 4, "Category": "customer_activity" },
    { "Tile_ID": "mobile_web_channels", "Workstream": "tech", "Title": "Setup Mobile/Web Channels", "Start_Week": 11, "Span_Weeks": 4, "Stack_Order": 3, "Category": "customer_activity" },
    { "Tile_ID": "data_exports", "Workstream": "tech", "Title": "Setup Data Exports", "Start_Week": 12, "Span_Weeks": 3, "Stack_Order": 4, "Category": "customer_activity" },
    { "Tile_ID": "tech_int_complete", "Workstream": "tech", "Title": "Tech Integration Complete", "Start_Week": 15, "Span_Weeks": 2, "Stack_Order": 2, "Category": "milestone" },
  
    { "Tile_ID": "build_launch_phase_1", "Workstream": "campaign", "Title": "Build and Launch Phase 1 Use Cases", "Start_Week": 12, "Span_Weeks": 6, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "journeys_live", "Workstream": "campaign", "Title": "Multi Channel Journeys Live", "Start_Week": 18, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
    { "Tile_ID": "launch_phase_2", "Workstream": "campaign", "Title": "Launch Phase 2 Use Cases (Optional)", "Start_Week": 20, "Span_Weeks": 5, "Stack_Order": 1, "Category": "customer_activity" },
  
    { "Tile_ID": "email_discovery_session", "Workstream": "email", "Title": "Email Discovery Workshop", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "email_config", "Workstream": "email", "Title": "Setup Email Config (DNS & SSL)", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "email_templates", "Workstream": "email", "Title": "Build Email Templates", "Start_Week": 7, "Span_Weeks": 4, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ip_warming_plan", "Workstream": "email", "Title": "Plan IP Warming", "Start_Week": 7, "Span_Weeks": 4, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "pre_ip_warming", "Workstream": "email", "Title": "Pre IP Warming Workshop", "Start_Week": 11, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "launch_ip_warming", "Workstream": "email", "Title": "Launch IP Warming", "Start_Week": 13, "Span_Weeks": 3, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "email_setup_complete", "Workstream": "email", "Title": "Email Setup Complete", "Start_Week": 16, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "sms_discovery_session", "Workstream": "sms", "Title": "SMS Discovery Workshop", "Start_Week": 1, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "test_long_code", "Workstream": "sms", "Title": "Test Long Code Secured", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "sms_sender_app", "Workstream": "sms", "Title": "Prepare Sender Application (incl. SMS Opt-in Flow Review)", "Start_Week": 5, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "sms_approval_process", "Workstream": "sms", "Title": "Additional Sender Approval Process (Timeline Dependent on SMS Scope)", "Start_Week": 8, "Span_Weeks": 9, "Stack_Order": 2, "Category": "onboarding_session" },
    { "Tile_ID": "sms_enablement", "Workstream": "sms", "Title": "SMS Enablement", "Start_Week": 11, "Span_Weeks": 3, "Stack_Order": 3, "Category": "onboarding_session" },
    { "Tile_ID": "qa_test_sms", "Workstream": "sms", "Title": "QA & Test SMS", "Start_Week": 14, "Span_Weeks": 3, "Stack_Order": 3, "Category": "customer_activity" },
    { "Tile_ID": "sms_setup_complete", "Workstream": "sms", "Title": "SMS Setup Complete", "Start_Week": 17, "Span_Weeks": 2, "Stack_Order": 2, "Category": "milestone" },
  
    { "Tile_ID": "whatsapp_discovery", "Workstream": "whatsapp", "Title": "WhatsApp Discovery Workshop", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "waba_walkthrough", "Workstream": "whatsapp", "Title": "WABA Process Walkthrough", "Start_Week": 7, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "acquire_waba", "Workstream": "whatsapp", "Title": "Acquire WABA", "Start_Week": 9, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_optin_campaign", "Workstream": "whatsapp", "Title": "Build & Launch Opt-in Campaign", "Start_Week": 12, "Span_Weeks": 4, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_templates", "Workstream": "whatsapp", "Title": "Build WA Templates in WA Manager", "Start_Week": 12, "Span_Weeks": 4, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "whatsapp_complete", "Workstream": "whatsapp", "Title": "WhatsApp Setup Complete", "Start_Week": 16, "Span_Weeks": 2, "Stack_Order": 1, "Category": "milestone" },
  
    { "Tile_ID": "live_foundations", "Workstream": "enablement", "Title": "Complete Live Foundations Courses", "Start_Week": 1, "Span_Weeks": 8, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "ondemand_learning", "Workstream": "enablement", "Title": "Complete On-Demand Braze Learning Courses", "Start_Week": 9, "Span_Weeks": 8, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "advanced_training", "Workstream": "enablement", "Title": "Attend Live Advanced Instructor Led Training Sessions", "Start_Week": 17, "Span_Weeks": 8, "Stack_Order": 1, "Category": "customer_activity" }
]);

/**
 * AI Decisioning Studio — **16 weeks**, lanes `one`–`four`, chevron styling on the canvas.
 * Milestones use `Category: milestone`; `Workstream` (`one`–`four`) selects which lane row they sit above. Edit this array or replace rows in Caboodle.
 */
const AI_DECISIONING_STUDIO_TEMPLATE: SeedTemplateTile[] = withDefaultStackOrder([
  {
    Tile_ID: "ads_ms_kickoff",
    Workstream: "one",
    Title: "Kick-off",
    Start_Week: 1,
    Span_Weeks: 1,
    Category: "milestone",
  },
  {
    Tile_ID: "ads_ms_design_finalized",
    Workstream: "one",
    Title: "Design finalized",
    Start_Week: 5,
    Span_Weeks: 1,
    Category: "milestone",
  },
  {
    Tile_ID: "ads_ms_golive_random",
    Workstream: "two",
    Title: "Go-live (random)",
    Start_Week: 11,
    Span_Weeks: 1,
    Category: "milestone",
  },
  {
    Tile_ID: "ads_ms_golive_trained",
    Workstream: "two",
    Title: "Go-live (trained)",
    Start_Week: 12,
    Span_Weeks: 1,
    Category: "milestone",
  },
  {
    Tile_ID: "ads_ms_results_readout",
    Workstream: "one",
    Title: "First formal results readout",
    Start_Week: 14,
    Span_Weeks: 2,
    Category: "milestone",
  },

  {
    Tile_ID: "ads_lane1_design_use_case",
    Workstream: "one",
    Title: "Design use case",
    Start_Week: 1,
    Span_Weeks: 4,
    Category: "customer_activity",
  },
  {
    Tile_ID: "ads_lane1_configure_ads",
    Workstream: "one",
    Title: "Configure Braze AI Decisioning Studio™",
    Start_Week: 5,
    Span_Weeks: 3,
    Category: "onboarding_session",
  },
  {
    Tile_ID: "ads_lane1_iteration",
    Workstream: "one",
    Title: "Set up and validate reporting",
    Start_Week: 8,
    Span_Weeks: 4,
    Category: "customer_activity",
  },
  {
    Tile_ID: "ads_lane1_tune_performance",
    Workstream: "one",
    Title: "Tune performance (as needed)",
    Start_Week: 12,
    Span_Weeks: 5,
    Category: "onboarding_session",
  },

  {
    Tile_ID: "ads_lane2_marketing_assets",
    Workstream: "two",
    Title: "Set up marketing assets (e.g., email templates)",
    Start_Week: 4,
    Span_Weeks: 4,
    Category: "customer_activity",
  },
  {
    Tile_ID: "ads_lane2_pre_golive_test",
    Workstream: "two",
    Title: "Conduct pre go-live testing",
    Start_Week: 9,
    Span_Weeks: 2,
    Category: "onboarding_session",
  },
  {
    Tile_ID: "ads_lane2_post_golive_test",
    Workstream: "two",
    Title: "Conduct post go-live testing",
    Start_Week: 11,
    Span_Weeks: 2,
    Category: "onboarding_session",
  },

  {
    Tile_ID: "ads_lane3_activation_channels",
    Workstream: "three",
    Title: "Integrate with activation channel(s)",
    Start_Week: 4,
    Span_Weeks: 4,
    Category: "customer_activity",
  },

  {
    Tile_ID: "ads_lane4_data_feed",
    Workstream: "four",
    Title:
      "Conduct data discovery and set up automated recurring data feed to Braze AI Decisioning Studio™",
    Start_Week: 4,
    Span_Weeks: 4,
    Category: "customer_activity",
  },
]);

const STANDARD_12_WEEK_TEMPLATE: SeedTemplateTile[] = withDefaultStackOrder([
  { "Tile_ID": "weekly_alignment", "Workstream": "governance", "Title": "Weekly Project Management Alignment Calls", "Start_Week": 1, "Span_Weeks": 48, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "project_kick_off", "Workstream": "governance", "Title": "Project Kick-Off", "Start_Week": 1, "Span_Weeks": 2, "Stack_Order": 2, "Category": "onboarding_session" },
  { "Tile_ID": "platform_gov", "Workstream": "governance", "Title": "Platform Governance & Security", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 2, "Category": "onboarding_session" },
  { "Tile_ID": "workbook_walkthrough", "Workstream": "governance", "Title": "Project Workbook Walkthrough", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 2, "Category": "onboarding_session" },
  { "Tile_ID": "setup_gov_task", "Workstream": "governance", "Title": "Setup Governance & Security", "Start_Week": 7, "Span_Weeks": 2, "Stack_Order": 2, "Category": "customer_activity" },
  { "Tile_ID": "dash_complete", "Workstream": "governance", "Title": "Dashboard Setup Complete", "Start_Week": 9, "Span_Weeks": 4, "Stack_Order": 4, "Category": "milestone" },

  { "Tile_ID": "data_workshop", "Workstream": "data", "Title": "Campaign & Data Planning Workshops", "Start_Week": 1, "Span_Weeks": 8, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "data_planning", "Workstream": "data", "Title": "Campaign & Data Planning", "Start_Week": 1, "Span_Weeks": 8, "Stack_Order": 2, "Category": "customer_activity" },
  { "Tile_ID": "data_complete", "Workstream": "data", "Title": "Campaign and Data Planning Complete", "Start_Week": 9, "Span_Weeks": 4, "Stack_Order": 1, "Category": "milestone" },

  { "Tile_ID": "tech_overview", "Workstream": "tech", "Title": "Tech Overview", "Start_Week": 4, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "sdk_deep_dive", "Workstream": "tech", "Title": "SDK Deep Dive", "Start_Week": 6, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "reporting_analytics", "Workstream": "tech", "Title": "Reporting & Analytics", "Start_Week": 8, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "api_deep_dive", "Workstream": "tech", "Title": "API Deep Dive", "Start_Week": 10, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "qa_testing", "Workstream": "tech", "Title": "QA & Testing", "Start_Week": 12, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "ext_id_logic", "Workstream": "tech", "Title": "Define External ID Logic", "Start_Week": 4, "Span_Weeks": 5, "Stack_Order": 2, "Category": "customer_activity" },
  { "Tile_ID": "office_hours", "Workstream": "tech", "Title": "Weekly Office Hours (Optional)", "Start_Week": 9, "Span_Weeks": 16, "Stack_Order": 2, "Category": "onboarding_session" },
  { "Tile_ID": "sdk_integration", "Workstream": "tech", "Title": "Integrate & QA SDKs & APIs", "Start_Week": 9, "Span_Weeks": 9, "Stack_Order": 3, "Category": "customer_activity" },
  { "Tile_ID": "user_import", "Workstream": "tech", "Title": "Import User Data & Subscription States", "Start_Week": 9, "Span_Weeks": 10, "Stack_Order": 4, "Category": "customer_activity" },
  { "Tile_ID": "channel_setup", "Workstream": "tech", "Title": "Setup Mobile/Web Channels", "Start_Week": 18, "Span_Weeks": 7, "Stack_Order": 3, "Category": "customer_activity" },
  { "Tile_ID": "data_exports", "Workstream": "tech", "Title": "Setup Data Exports", "Start_Week": 19, "Span_Weeks": 6, "Stack_Order": 4, "Category": "customer_activity" },
  { "Tile_ID": "tech_complete", "Workstream": "tech", "Title": "Tech Integration Complete", "Start_Week": 25, "Span_Weeks": 4, "Stack_Order": 2, "Category": "milestone" },

  { "Tile_ID": "email_discovery_session", "Workstream": "email", "Title": "Email Discovery Workshop", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "email_dns_ssl", "Workstream": "email", "Title": "Setup Email Config (DNS & SSL)", "Start_Week": 5, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
  { "Tile_ID": "email_templates", "Workstream": "email", "Title": "Build Email Templates", "Start_Week": 8, "Span_Weeks": 6, "Stack_Order": 1, "Category": "customer_activity" },
  { "Tile_ID": "ip_warming_plan", "Workstream": "email", "Title": "Plan IP Warming", "Start_Week": 8, "Span_Weeks": 6, "Stack_Order": 2, "Category": "customer_activity" },
  { "Tile_ID": "pre_ip_warming", "Workstream": "email", "Title": "Pre IP Warming Workshop", "Start_Week": 14, "Span_Weeks": 3, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "launch_ip_warming", "Workstream": "email", "Title": "Launch IP Warming", "Start_Week": 17, "Span_Weeks": 5, "Stack_Order": 2, "Category": "customer_activity" },
  { "Tile_ID": "email_complete", "Workstream": "email", "Title": "Email Setup Complete", "Start_Week": 22, "Span_Weeks": 4, "Stack_Order": 1, "Category": "milestone" },

  { "Tile_ID": "sms_discovery_session", "Workstream": "sms", "Title": "SMS Discovery Workshop", "Start_Week": 1, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "sms_long_code", "Workstream": "sms", "Title": "Test Long Code Secured", "Start_Week": 3, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
  { "Tile_ID": "sms_sender_app", "Workstream": "sms", "Title": "Prepare Sender Application (incl. SMS Opt-in Flow Review)", "Start_Week": 5, "Span_Weeks": 3, "Stack_Order": 1, "Category": "customer_activity" },
  { "Tile_ID": "sms_approvals", "Workstream": "sms", "Title": "Additional Sender Approval Process (Timeline Dependent on SMS Scope)", "Start_Week": 8, "Span_Weeks": 20, "Stack_Order": 2, "Category": "onboarding_session" },
  { "Tile_ID": "sms_enablement", "Workstream": "sms", "Title": "SMS Enablement", "Start_Week": 15, "Span_Weeks": 6, "Stack_Order": 3, "Category": "onboarding_session" },
  { "Tile_ID": "sms_qa", "Workstream": "sms", "Title": "QA & Test SMS", "Start_Week": 21, "Span_Weeks": 6, "Stack_Order": 3, "Category": "customer_activity" },
  { "Tile_ID": "sms_complete", "Workstream": "sms", "Title": "SMS Setup Complete", "Start_Week": 27, "Span_Weeks": 4, "Stack_Order": 4, "Category": "milestone" },

  { "Tile_ID": "whatsapp_discovery", "Workstream": "whatsapp", "Title": "WhatsApp Discovery Workshop", "Start_Week": 5, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "waba_walkthrough", "Workstream": "whatsapp", "Title": "WABA Process Walkthrough", "Start_Week": 7, "Span_Weeks": 2, "Stack_Order": 1, "Category": "onboarding_session" },
    { "Tile_ID": "acquire_waba", "Workstream": "whatsapp", "Title": "Acquire WABA", "Start_Week": 9, "Span_Weeks": 4, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_optin_campaign", "Workstream": "whatsapp", "Title": "Build & Launch Opt-in Campaign", "Start_Week": 13, "Span_Weeks": 8, "Stack_Order": 1, "Category": "customer_activity" },
    { "Tile_ID": "wa_templates", "Workstream": "whatsapp", "Title": "Build WA Templates in WA Manager", "Start_Week": 13, "Span_Weeks": 8, "Stack_Order": 2, "Category": "customer_activity" },
    { "Tile_ID": "whatsapp_complete", "Workstream": "whatsapp", "Title": "WhatsApp Setup Complete", "Start_Week": 21, "Span_Weeks": 4, "Stack_Order": 1, "Category": "milestone" },
  

  { "Tile_ID": "phase_1_build", "Workstream": "campaign", "Title": "Build and Launch Phase 1 Use Cases", "Start_Week": 17, "Span_Weeks": 15, "Stack_Order": 1, "Category": "customer_activity" },
  { "Tile_ID": "journeys_live", "Workstream": "campaign", "Title": "Multi Channel Journeys Live", "Start_Week": 32, "Span_Weeks": 3, "Stack_Order": 1, "Category": "milestone" },
  { "Tile_ID": "phase_2_optional", "Workstream": "campaign", "Title": "Launch Phase 2 Use Cases (Optional)", "Start_Week": 35, "Span_Weeks": 14, "Stack_Order": 1, "Category": "customer_activity" },

  { "Tile_ID": "foundations_live", "Workstream": "enablement", "Title": "Complete Live Foundations Courses", "Start_Week": 1, "Span_Weeks": 16, "Stack_Order": 1, "Category": "customer_activity" },
  { "Tile_ID": "ondemand_learning", "Workstream": "enablement", "Title": "Complete On-Demand Braze Learning Courses", "Start_Week": 17, "Span_Weeks": 16, "Stack_Order": 1, "Category": "customer_activity" },
  { "Tile_ID": "advanced_training", "Workstream": "enablement", "Title": "Attend Live Advanced Instructor Led Training Sessions", "Start_Week": 33, "Span_Weeks": 16, "Stack_Order": 1, "Category": "customer_activity" }

  ]);

export const TIMELINE_CONFIGS: Record<PlanOptionId, TimelineConfig> = {
  growth_silver: {
    phases: [
      { name: "Discovery & Planning", span: 16 },
      { name: "Execution", span: 24 },
      { name: "Post Go-Live Support", span: 8 },
    ],
    months: [],
  },
  quickstart_silver: {
    phases: [
      { name: "Discovery & Planning", span: 6 },
      { name: "Execution", span: 8 },
      { name: "Post Go-Live Support", span: 4 },
    ],
    months: [
      { name: "Month 1", span: 4 },
      { name: "Month 2", span: 4 },
      { name: "Month 3", span: 4 },
    ],
  },
  ignite_silver: {
    phases: [
      { name: "Discovery & Planning", span: 7 },
      { name: "Execution", span: 9 },
      { name: "Post Go-Live Support", span: 4 },
    ],
    months: [
      { name: "Month 1", span: 8 },
      { name: "Month 2", span: 8 },
      { name: "Month 3", span: 8 },
      { name: "Month 4", span: 8 },
      { name: "Month 5", span: 8 },
    ],
  },
  "12_week": {
    phases: [
      { name: "Discovery & Planning", span: 16 },
      { name: "Execution", span: 24 },
      { name: "Post Go-Live Support", span: 8 },
    ],
    months: [
      { name: "Month 1", span: 8 },
      { name: "Month 2", span: 8 },
      { name: "Month 3", span: 8 },
      { name: "Month 4", span: 8 },
      { name: "Month 5", span: 8 },
      { name: "Month 6", span: 8 },
    ],
  },
  quickstart_gold: {
    phases: [
      { name: "Discovery & Planning", span: 6 },
      { name: "Execution", span: 8 },
      { name: "Post Go-Live Support", span: 4 },
    ],
    months: [
      { name: "Month 1", span: 4 },
      { name: "Month 2", span: 4 },
      { name: "Month 3", span: 4 },
    ],
  },
  ignite_gold: {
    phases: [
      { name: "Discovery & Planning", span: 7 },
      { name: "Execution", span: 9 },
      { name: "Post Go-Live Support", span: 4 },
    ],
    months: [
      { name: "Month 1", span: 4 },
      { name: "Month 2", span: 4 },
      { name: "Month 3", span: 4 },
      { name: "Month 4", span: 4 },
      { name: "Month 5", span: 4 },
    ],
  },
  ai_decisioning_studio: {
    phases: [
      { name: "Discovery & Planning", span: 5 },
      { name: "Build & Launch", span: 8 },
      { name: "Optimization", span: 3 },
    ],
    months: [],
  },
};

export function getTimelineConfig(planOptionId: PlanOptionId): TimelineConfig {
  return TIMELINE_CONFIGS[planOptionId] ?? TIMELINE_CONFIGS["12_week"];
}

/** Seed tiles when creating a config with product **AI Decisioning Studio**. */
export function getAiDecisioningStudioSeedTemplate(): SeedTemplateTile[] {
  return AI_DECISIONING_STUDIO_TEMPLATE.map((tile) => ({ ...tile }));
}

export function getSeedTemplate(planOptionId: PlanOptionId): SeedTemplateTile[] {
  const baseTemplate =
    planOptionId === "growth_silver"
      ? GROWTH_SILVER_TEMPLATE
      : planOptionId === "quickstart_silver"
        ? QUICKSTART_SILVER_TEMPLATE
        : planOptionId === "ignite_silver"
          ? IGNITE_SILVER_TEMPLATE
          : planOptionId === "ignite_gold"
          ? IGNITE_GOLD_TEMPLATE
          : planOptionId === "quickstart_gold"
            ? QUICKSTART_GOLD_TEMPLATE
            : STANDARD_12_WEEK_TEMPLATE;

  return baseTemplate.map((tile) => ({ ...tile }));
}
