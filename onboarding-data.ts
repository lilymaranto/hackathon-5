// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ItemKind = "activity" | "session" | "milestone";
export type BoxStyle = "white" | "grey" | "blue" | "bar-grey";

export interface DocLink {
  name: string;
  url?: string;
}

export interface CourseLink {
  name: string;
  url?: string;
}

export interface PlanItem {
  id: string;
  kind: ItemKind;
  boxStyle: BoxStyle;
  label: string;
  /** 1-indexed start column in the 24-column timeline grid */
  colStart: number;
  /** exclusive end column (colStart + span), max 25 */
  colEnd: number;
  /** 0-indexed row within the swim lane rowDefs array */
  rowIndex: number;

  // ── Activity fields ──────────────────────────────────────────────────────
  description?: string;
  stakeholders?: string[];
  documentation?: DocLink[];
  prepWork?: string[];
  learningCourses?: CourseLink[];

  // ── Session fields ───────────────────────────────────────────────────────
  agenda?: string[];
  attendees?: string[];
  desiredOutcomes?: string[];
}

export interface RowDef {
  top: number; // px from top of the lane's content area
  height: number; // px
}

export interface SwimLane {
  id: string;
  label: string;
  labelBg: string;
  labelText: string;
  /** Precomputed row geometry */
  rowDefs: RowDef[];
  /** Total content height (px) including bottom padding */
  totalHeight: number;
  items: PlanItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
// 24-column timeline grid — month boundaries:
//   Month 1  : cols  1-7   (7 cols)
//   Month 2  : cols  8-11  (4 cols)
//   Month 3  : cols 12-15  (4 cols)
//   Month 4  : cols 16-18  (3 cols)
//   Month 5  : cols 19-21  (3 cols)
//   Month 6-7: cols 22-24  (3 cols, end = 25)

const PAD = 8; // top + bottom padding inside each lane
const BAR = 30; // thin bar row height
const ROW = 44; // normal item row height
const GAP = 4; // gap between rows

function rows(...heights: number[]): { defs: RowDef[]; total: number } {
  const defs: RowDef[] = [];
  let top = PAD;
  for (const h of heights) {
    defs.push({ top, height: h });
    top += h + GAP;
  }
  return { defs, total: top - GAP + PAD };
}

// ─────────────────────────────────────────────────────────────────────────────
// Swim Lane Data
// ─────────────────────────────────────────────────────────────────────────────

const pm = rows(BAR, ROW);
const data = rows(BAR, ROW);
const tech = rows(ROW, ROW, ROW, ROW);
const email = rows(ROW, ROW);
const sms = rows(ROW, ROW);
const campaign = rows(ROW);
const enablement = rows(ROW);

export const swimLanes: SwimLane[] = [
  // ── Project Management & Platform Governance ────────────────────────────
  {
    id: "pm",
    label: "Project Management & Platform Governance",
    labelBg: "#E87722",
    labelText: "#fff",
    rowDefs: pm.defs,
    totalHeight: pm.total,
    items: [
      {
        id: "weekly-pm-calls",
        kind: "session",
        boxStyle: "bar-grey",
        label: "Weekly Project Management Alignment Calls",
        colStart: 1,
        colEnd: 25,
        rowIndex: 0,
        agenda: [
          "Project status updates and progress review",
          "Risk and issue identification and mitigation",
          "Action item review and accountability",
          "Timeline and milestone alignment",
          "Upcoming week priorities",
        ],
        attendees: [
          "Customer Project Manager",
          "Braze Onboarding Manager",
          "Key stakeholders from customer side",
          "Braze Solutions Architect (as needed)",
        ],
        desiredOutcomes: [
          "All parties aligned on current project status",
          "Risks clearly documented with owners and mitigation plans",
          "Clear action items assigned with due dates",
          "Confidence in timeline and upcoming milestones",
        ],
      },
      {
        id: "project-kickoff",
        kind: "session",
        boxStyle: "grey",
        label: "Project Kick-Off",
        colStart: 1,
        colEnd: 3,
        rowIndex: 1,
        agenda: [
          "Team introductions",
          "Project vision and success definition",
          "Scope and timeline walkthrough",
          "Communication cadence and escalation path",
          "Q&A",
        ],
        attendees: [
          "Executive sponsors",
          "Customer project team leads",
          "Braze Onboarding Manager",
          "Braze Solutions Architect",
          "Technical leads",
        ],
        desiredOutcomes: [
          "Shared understanding of project scope and goals",
          "Agreed timeline and key milestones",
          "Defined communication and escalation process",
          "Team relationships established",
        ],
      },
      {
        id: "platform-governance",
        kind: "session",
        boxStyle: "grey",
        label: "Platform Governance & Security",
        colStart: 3,
        colEnd: 5,
        rowIndex: 1,
        agenda: [
          "Workspace structure and naming conventions",
          "User roles and permission model overview",
          "SSO / SAML configuration walkthrough",
          "Data security and compliance requirements",
          "Approval workflow setup",
        ],
        attendees: [
          "IT / Security team",
          "Braze Onboarding Manager",
          "Braze Solutions Architect",
          "System Administrator",
        ],
        desiredOutcomes: [
          "Governance model documented and agreed",
          "Security requirements mapped to Braze configuration",
          "SSO configuration requirements captured",
          "User roles and permission structure defined",
        ],
      },
      {
        id: "project-workbook",
        kind: "session",
        boxStyle: "grey",
        label: "Project Workbook Walkthrough",
        colStart: 5,
        colEnd: 7,
        rowIndex: 1,
        agenda: [
          "Workbook structure and purpose",
          "Key deliverables and ownership",
          "Timeline and dependency mapping",
          "Open items and next steps",
        ],
        attendees: [
          "Project Manager",
          "Braze Onboarding Manager",
          "Technical and marketing leads",
        ],
        desiredOutcomes: [
          "All parties understand the workbook and their responsibilities",
          "Deliverables assigned with owners and target dates",
          "Dependencies documented",
        ],
      },
      {
        id: "setup-governance",
        kind: "activity",
        boxStyle: "blue",
        label: "Setup Governance & Security",
        colStart: 6,
        colEnd: 8,
        rowIndex: 1,
        description:
          "Configure workspace governance settings, user roles, permissions, and security integrations including SSO/SAML, IP allowlisting, and data access controls.",
        stakeholders: ["IT / Security team", "System Administrator", "Project Manager"],
        documentation: [
          { name: "Braze Workspace Security Guide", url: "https://www.braze.com/docs/user_guide/administrative/app_settings/manage_your_braze_users/user_permissions/" },
          { name: "SSO / SAML Configuration", url: "https://www.braze.com/docs/user_guide/administrative/access_braze/single_sign_on/" },
        ],
        prepWork: [
          "Identify required user roles and permission levels",
          "Gather SSO / IdP configuration details",
          "Define workspace naming conventions",
          "Prepare list of initial users to onboard",
        ],
        learningCourses: [
          { name: "Braze Security & Permissions (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "dashboard-complete",
        kind: "milestone",
        boxStyle: "white",
        label: "Dashboard Setup Complete",
        colStart: 8,
        colEnd: 9,
        rowIndex: 1,
      },
    ],
  },

  // ── Data ────────────────────────────────────────────────────────────────
  {
    id: "data",
    label: "Data",
    labelBg: "#C4A7E7",
    labelText: "#3b0764",
    rowDefs: data.defs,
    totalHeight: data.total,
    items: [
      {
        id: "data-planning-workshops",
        kind: "session",
        boxStyle: "bar-grey",
        label: "Campaign & Data Planning Workshops",
        colStart: 1,
        colEnd: 8,
        rowIndex: 0,
        agenda: [
          "Current state data architecture review",
          "User data model and identifier strategy",
          "Event taxonomy and custom attribute planning",
          "Segmentation strategy",
          "Data governance requirements",
        ],
        attendees: [
          "Data / Analytics team",
          "Marketing / CRM team",
          "Braze Solutions Architect",
          "Braze Onboarding Manager",
        ],
        desiredOutcomes: [
          "Agreed user data model and identifier strategy",
          "Event and attribute taxonomy documented",
          "Segmentation strategy defined",
          "Data governance requirements captured",
        ],
      },
      {
        id: "campaign-data-planning",
        kind: "activity",
        boxStyle: "white",
        label: "Campaign & Data Planning",
        colStart: 1,
        colEnd: 8,
        rowIndex: 1,
        description:
          "Complete the campaign and data planning workbook, documenting user data schema, event taxonomy, segmentation strategy, and initial use case requirements.",
        stakeholders: [
          "Data / Analytics team",
          "Marketing / CRM team",
          "Braze Solutions Architect",
        ],
        documentation: [
          { name: "Data & Campaign Planning Workbook" },
          { name: "Braze Data Ingestion Overview", url: "https://www.braze.com/docs/user_guide/data_and_analytics/user_data_collection/" },
        ],
        prepWork: [
          "Document current data architecture",
          "Identify key user identifiers",
          "List required custom events and attributes",
          "Outline initial use cases and target segments",
        ],
        learningCourses: [
          { name: "Understanding Braze Data (Braze Learning)", url: "https://learning.braze.com" },
          { name: "Segmentation (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "data-planning-complete",
        kind: "milestone",
        boxStyle: "white",
        label: "Campaign and Data Planning Complete",
        colStart: 8,
        colEnd: 9,
        rowIndex: 1,
      },
    ],
  },

  // ── Technical Integration ────────────────────────────────────────────────
  {
    id: "technical",
    label: "Technical Integration",
    labelBg: "#7B4F9E",
    labelText: "#fff",
    rowDefs: tech.defs,
    totalHeight: tech.total,
    items: [
      {
        id: "tech-overview",
        kind: "session",
        boxStyle: "grey",
        label: "Tech Overview",
        colStart: 1,
        colEnd: 3,
        rowIndex: 0,
        agenda: [
          "Braze architecture and infrastructure overview",
          "SDK vs. API data ingestion options",
          "Integration architecture review",
          "Q&A on technical requirements",
        ],
        attendees: [
          "Engineering / Development team",
          "Braze Solutions Architect",
          "Mobile and web developers",
        ],
        desiredOutcomes: [
          "Technical team understands Braze architecture",
          "Integration approach validated",
          "Key technical questions answered",
        ],
      },
      {
        id: "sdk-deep-dive",
        kind: "session",
        boxStyle: "grey",
        label: "SDK Deep Dive",
        colStart: 3,
        colEnd: 5,
        rowIndex: 0,
        agenda: [
          "SDK initialisation and configuration",
          "User identification and aliasing",
          "Logging custom events and attributes",
          "Push notification setup",
          "In-app messaging configuration",
        ],
        attendees: [
          "Mobile and web developers",
          "Braze Solutions Architect",
        ],
        desiredOutcomes: [
          "SDK integration approach confirmed",
          "Developers have working knowledge of SDK methods",
          "Integration checklist agreed",
        ],
      },
      {
        id: "reporting-analytics",
        kind: "session",
        boxStyle: "grey",
        label: "Reporting & Analytics",
        colStart: 5,
        colEnd: 7,
        rowIndex: 0,
        agenda: [
          "Braze analytics dashboard overview",
          "Campaign and Canvas reporting",
          "Custom reporting and data export options",
          "Currents and data warehouse integration",
        ],
        attendees: [
          "Analytics / Data team",
          "Marketing team",
          "Braze Onboarding Manager",
        ],
        desiredOutcomes: [
          "Team understands available reporting capabilities",
          "KPI tracking approach defined",
          "Data export requirements documented",
        ],
      },
      {
        id: "api-deep-dive",
        kind: "session",
        boxStyle: "grey",
        label: "API Deep Dive",
        colStart: 8,
        colEnd: 10,
        rowIndex: 0,
        agenda: [
          "Braze REST API overview",
          "User track and user export endpoints",
          "Messaging trigger APIs",
          "Authentication and rate limits",
          "API testing walkthrough",
        ],
        attendees: [
          "Backend engineering team",
          "Braze Solutions Architect",
        ],
        desiredOutcomes: [
          "Team understands key API endpoints",
          "Authentication configured",
          "Integration use cases mapped to API calls",
        ],
      },
      {
        id: "qa-testing",
        kind: "session",
        boxStyle: "grey",
        label: "QA & Testing",
        colStart: 10,
        colEnd: 12,
        rowIndex: 0,
        agenda: [
          "QA framework and testing methodology",
          "Event validation with Braze debugger",
          "SDK and API testing checklist",
          "Common integration issues and resolutions",
        ],
        attendees: [
          "QA / Engineering team",
          "Braze Solutions Architect",
        ],
        desiredOutcomes: [
          "QA process defined and documented",
          "Testing checklist agreed",
          "Team confident in validation approach",
        ],
      },
      {
        id: "define-external-id",
        kind: "activity",
        boxStyle: "white",
        label: "Define External ID Logic",
        colStart: 1,
        colEnd: 8,
        rowIndex: 1,
        description:
          "Define and document the external user ID strategy, including the format, source system, aliasing approach for anonymous users, and migration plan from any existing identifiers.",
        stakeholders: [
          "Data / Engineering team",
          "CRM / Marketing team",
          "Braze Solutions Architect",
        ],
        documentation: [
          { name: "User IDs Best Practices", url: "https://www.braze.com/docs/developer_guide/platform_integration_guides/swift/analytics/setting_user_ids/" },
          { name: "User Aliasing", url: "https://www.braze.com/docs/user_guide/data_and_analytics/user_data_collection/user_profile_lifecycle/" },
        ],
        prepWork: [
          "Audit existing user identifier landscape",
          "Identify primary and secondary identifier sources",
          "Define anonymous to known user merge strategy",
        ],
        learningCourses: [
          { name: "User Data & ID Management (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "weekly-office-hours",
        kind: "session",
        boxStyle: "bar-grey",
        label: "Weekly Office Hours (Optional)",
        colStart: 8,
        colEnd: 19,
        rowIndex: 1,
        agenda: [
          "Open Q&A on technical blockers",
          "Integration review and troubleshooting",
          "Configuration guidance",
          "Best practice recommendations",
        ],
        attendees: [
          "Customer engineering team (as needed)",
          "Braze Solutions Architect",
        ],
        desiredOutcomes: [
          "Technical blockers resolved",
          "Integration progressing on schedule",
          "Team confidence maintained",
        ],
      },
      {
        id: "integrate-qa-sdks",
        kind: "activity",
        boxStyle: "white",
        label: "Integrate & QA SDKs & APIs",
        colStart: 8,
        colEnd: 12,
        rowIndex: 2,
        description:
          "Implement the Braze SDK across mobile and web surfaces, integrate REST API calls for server-side data, and validate all integrations using the Braze event debugger and QA checklist.",
        stakeholders: [
          "Mobile developers",
          "Web developers",
          "Backend engineers",
          "QA team",
        ],
        documentation: [
          { name: "iOS SDK Integration Guide", url: "https://www.braze.com/docs/developer_guide/platform_integration_guides/swift/" },
          { name: "Android SDK Integration Guide", url: "https://www.braze.com/docs/developer_guide/platform_integration_guides/android/" },
          { name: "Web SDK Integration Guide", url: "https://www.braze.com/docs/developer_guide/platform_integration_guides/web/" },
          { name: "REST API Reference", url: "https://www.braze.com/docs/api/basics/" },
        ],
        prepWork: [
          "Complete external ID logic definition",
          "Set up development/staging environment",
          "Prepare test user accounts",
          "Review SDK integration guides",
        ],
        learningCourses: [
          { name: "SDK Integration (Braze Learning)", url: "https://learning.braze.com" },
          { name: "REST API Fundamentals (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "setup-mobile-web",
        kind: "activity",
        boxStyle: "white",
        label: "Setup Mobile/Web Channels",
        colStart: 12,
        colEnd: 16,
        rowIndex: 2,
        description:
          "Configure push notification channels (iOS, Android, Web), in-app message display settings, Content Cards, and any additional messaging channels needed for your use cases.",
        stakeholders: [
          "Mobile developers",
          "Web developers",
          "Marketing team",
        ],
        documentation: [
          { name: "Push Notifications Setup", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/push/" },
          { name: "In-App Messages", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/in-app_messages/" },
          { name: "Content Cards", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/content_cards/" },
        ],
        prepWork: [
          "Obtain APNs certificate / FCM credentials",
          "Define push opt-in prompt strategy",
          "Identify required channel types",
        ],
        learningCourses: [
          { name: "Push Notifications (Braze Learning)", url: "https://learning.braze.com" },
          { name: "In-App Messages (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "import-user-data",
        kind: "activity",
        boxStyle: "white",
        label: "Import User Data & Subscription States",
        colStart: 8,
        colEnd: 12,
        rowIndex: 3,
        description:
          "Perform initial bulk import of existing user profiles, historical attributes, and subscription/opt-in states via CSV upload or the User Track API, ensuring data quality and compliance.",
        stakeholders: [
          "Data / Engineering team",
          "CRM / Marketing team",
          "Legal / Compliance team",
        ],
        documentation: [
          { name: "User Import via CSV", url: "https://www.braze.com/docs/user_guide/data_and_analytics/user_data_collection/user_import/" },
          { name: "Subscription Groups", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/email/managing_user_subscriptions/" },
        ],
        prepWork: [
          "Audit and clean existing user data",
          "Map existing attributes to Braze schema",
          "Validate subscription/opt-in records",
          "Prepare import file(s) in the correct format",
        ],
        learningCourses: [
          { name: "User Data & Imports (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "setup-data-exports",
        kind: "activity",
        boxStyle: "white",
        label: "Setup Data Exports",
        colStart: 13,
        colEnd: 16,
        rowIndex: 3,
        description:
          "Configure Braze Currents or data export integrations to stream event-level data to your data warehouse, BI tools, or CDP for analytics and attribution.",
        stakeholders: [
          "Data / Engineering team",
          "Analytics team",
          "Braze Solutions Architect",
        ],
        documentation: [
          { name: "Braze Currents Overview", url: "https://www.braze.com/docs/user_guide/data_and_analytics/braze_currents/" },
          { name: "Export APIs", url: "https://www.braze.com/docs/api/endpoints/export/" },
        ],
        prepWork: [
          "Identify data warehouse / destination",
          "Provision receiving infrastructure",
          "Determine required event types",
        ],
        learningCourses: [
          { name: "Braze Currents (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "tech-integration-complete",
        kind: "milestone",
        boxStyle: "white",
        label: "Technical Integration Complete",
        colStart: 16,
        colEnd: 17,
        rowIndex: 2,
      },
    ],
  },

  // ── Email ────────────────────────────────────────────────────────────────
  {
    id: "email",
    label: "Email",
    labelBg: "#6D2F6B",
    labelText: "#fff",
    rowDefs: email.defs,
    totalHeight: email.total,
    items: [
      {
        id: "email-discovery",
        kind: "session",
        boxStyle: "grey",
        label: "Email Discovery Workshop",
        colStart: 1,
        colEnd: 3,
        rowIndex: 0,
        agenda: [
          "Current email programme and ESP overview",
          "Sending domain and IP strategy",
          "List hygiene and suppression requirements",
          "Deliverability goals and current performance",
          "Template and design requirements",
        ],
        attendees: [
          "Email marketing team",
          "Deliverability / CRM manager",
          "Braze Onboarding Manager",
          "Braze Deliverability Specialist",
        ],
        desiredOutcomes: [
          "Current email programme documented",
          "Domain and IP strategy agreed",
          "Deliverability risk areas identified",
          "Template requirements captured",
        ],
      },
      {
        id: "setup-email-config",
        kind: "activity",
        boxStyle: "white",
        label: "Setup Email Config (DNS & SSL)",
        colStart: 3,
        colEnd: 6,
        rowIndex: 0,
        description:
          "Configure sending domain DNS records (SPF, DKIM, DMARC), set up custom tracking domains with SSL, and complete the email channel configuration in Braze.",
        stakeholders: [
          "IT / DNS team",
          "Email marketing team",
          "Braze Onboarding Manager",
        ],
        documentation: [
          { name: "Email Setup Guide", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/email/email_setup/" },
          { name: "DNS Record Configuration", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/email/email_setup/setting_up_ips_and_domains/" },
        ],
        prepWork: [
          "Identify sending domains",
          "Obtain DNS admin access",
          "Confirm SSL certificate approach",
          "Gather existing DMARC policy details",
        ],
        learningCourses: [
          { name: "Email Setup & Deliverability (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "build-email-templates",
        kind: "activity",
        boxStyle: "blue",
        label: "Build Email Templates",
        colStart: 8,
        colEnd: 12,
        rowIndex: 0,
        description:
          "Design and build responsive email templates in Braze using the drag-and-drop editor or custom HTML, including brand-compliant headers/footers, unsubscribe links, and preference centre integration.",
        stakeholders: [
          "Email marketing team",
          "Design / Brand team",
          "Braze Onboarding Manager",
        ],
        documentation: [
          { name: "Email Template Editor", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/email/drag_and_drop/" },
          { name: "Custom HTML Templates", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/email/creating_an_email_campaign/" },
        ],
        prepWork: [
          "Gather brand guidelines and assets",
          "Identify required template types",
          "Confirm unsubscribe / preference centre approach",
        ],
        learningCourses: [
          { name: "Email Templates (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "pre-ip-warming-workshop",
        kind: "session",
        boxStyle: "grey",
        label: "Pre IP Warming Workshop",
        colStart: 12,
        colEnd: 15,
        rowIndex: 0,
        agenda: [
          "IP warming process and timeline overview",
          "Volume ramp schedule planning",
          "Segment selection strategy for warm-up sends",
          "Monitoring metrics and success criteria",
          "Escalation plan if deliverability issues arise",
        ],
        attendees: [
          "Email marketing team",
          "Braze Onboarding Manager",
          "Braze Deliverability Specialist",
        ],
        desiredOutcomes: [
          "IP warming schedule agreed and documented",
          "Segment strategy for warm-up confirmed",
          "Monitoring plan in place",
          "Team confident to execute warm-up",
        ],
      },
      {
        id: "launch-ip-warming",
        kind: "activity",
        boxStyle: "white",
        label: "Launch IP Warming",
        colStart: 15,
        colEnd: 18,
        rowIndex: 0,
        description:
          "Execute the agreed IP warming schedule, gradually increasing send volume while monitoring deliverability metrics (inbox rates, bounces, spam complaints) and adjusting as needed.",
        stakeholders: [
          "Email marketing team",
          "Braze Onboarding Manager",
          "Braze Deliverability Specialist",
        ],
        documentation: [
          { name: "IP Warming Overview", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/email/email_setup/ip_warming/" },
        ],
        prepWork: [
          "Complete email template QA",
          "Confirm initial send segments",
          "Set up deliverability monitoring dashboards",
        ],
        learningCourses: [
          { name: "Email Deliverability & IP Warming (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "email-complete",
        kind: "milestone",
        boxStyle: "white",
        label: "Email Setup Complete",
        colStart: 18,
        colEnd: 19,
        rowIndex: 0,
      },
      {
        id: "plan-ip-warming",
        kind: "activity",
        boxStyle: "blue",
        label: "Plan IP Warming",
        colStart: 8,
        colEnd: 12,
        rowIndex: 1,
        description:
          "Document the detailed IP warming plan including volume ramp schedule, segment selection criteria, daily send targets, and monitoring KPIs.",
        stakeholders: [
          "Email marketing team",
          "Braze Deliverability Specialist",
        ],
        documentation: [
          { name: "IP Warming Schedule Template" },
          { name: "IP Warming Overview", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/email/email_setup/ip_warming/" },
        ],
        prepWork: [
          "Gather historical email volume data",
          "Identify best-engaged segments for warm-up",
          "Review current list health metrics",
        ],
        learningCourses: [
          { name: "Email Deliverability (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
    ],
  },

  // ── SMS ─────────────────────────────────────────────────────────────────
  {
    id: "sms",
    label: "SMS",
    labelBg: "#7D3068",
    labelText: "#fff",
    rowDefs: sms.defs,
    totalHeight: sms.total,
    items: [
      {
        id: "sms-discovery",
        kind: "session",
        boxStyle: "grey",
        label: "SMS Discovery Workshop",
        colStart: 1,
        colEnd: 3,
        rowIndex: 0,
        agenda: [
          "SMS programme goals and use cases",
          "Sender type selection (long code, short code, toll-free)",
          "Geographic and carrier requirements",
          "Compliance and opt-in requirements (TCPA, CTIA)",
          "Integration with opt-in flows",
        ],
        attendees: [
          "Marketing / CRM team",
          "Legal / Compliance team",
          "Braze Onboarding Manager",
          "Braze SMS Specialist",
        ],
        desiredOutcomes: [
          "SMS strategy and use cases documented",
          "Sender type(s) confirmed",
          "Compliance requirements captured",
          "Opt-in flow approach agreed",
        ],
      },
      {
        id: "test-long-code",
        kind: "activity",
        boxStyle: "white",
        label: "Test Long Code Secured",
        colStart: 3,
        colEnd: 5,
        rowIndex: 0,
        description:
          "Obtain and configure a test long code number within Braze for development and QA purposes prior to production sender provisioning.",
        stakeholders: [
          "Engineering team",
          "Braze Onboarding Manager",
        ],
        documentation: [
          { name: "SMS Setup Guide", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/sms/sms_setup/" },
        ],
        prepWork: [
          "Confirm required countries and regions",
          "Prepare test phone numbers",
        ],
        learningCourses: [
          { name: "SMS & MMS Setup (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "prepare-sender-app",
        kind: "activity",
        boxStyle: "white",
        label: "Prepare Sender Application (incl. SMS Opt-in Flow Review)",
        colStart: 5,
        colEnd: 8,
        rowIndex: 0,
        description:
          "Complete the carrier sender application including business registration, use case description, message samples, and opt-in flow documentation. Review and validate opt-in flows meet TCPA/CTIA compliance standards.",
        stakeholders: [
          "Legal / Compliance team",
          "Marketing team",
          "Braze Onboarding Manager",
        ],
        documentation: [
          { name: "SMS Sender Registration", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/sms/sms_setup/short_and_long_codes/" },
          { name: "TCPA Compliance Guide" },
        ],
        prepWork: [
          "Draft opt-in language and disclosures",
          "Capture sample messages for application",
          "Complete business registration details",
          "Document opt-in touchpoints",
        ],
        learningCourses: [
          { name: "SMS Compliance & Best Practices (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "sender-approval-process",
        kind: "session",
        boxStyle: "bar-grey",
        label: "Additional Sender Approval Process (Timeline Dependent on SMS Scope)",
        colStart: 8,
        colEnd: 19,
        rowIndex: 0,
        agenda: [
          "Carrier registration status updates",
          "Pending application review items",
          "Timeline management",
        ],
        attendees: [
          "Braze Onboarding Manager",
          "Customer Project Manager",
        ],
        desiredOutcomes: [
          "Sender approved and provisioned",
          "SMS subscription groups configured",
          "Ready to proceed to SMS enablement",
        ],
      },
      {
        id: "sms-enablement",
        kind: "session",
        boxStyle: "grey",
        label: "SMS Enablement",
        colStart: 12,
        colEnd: 16,
        rowIndex: 1,
        agenda: [
          "SMS subscription group configuration",
          "Keyword handling setup (STOP, HELP, START)",
          "MMS configuration (if applicable)",
          "Liquid personalisation in SMS",
          "Building and testing your first SMS campaign",
        ],
        attendees: [
          "Marketing / CRM team",
          "Engineering team",
          "Braze Onboarding Manager",
        ],
        desiredOutcomes: [
          "SMS fully configured in Braze",
          "Keyword responses set up",
          "Team able to build and send SMS campaigns",
        ],
      },
      {
        id: "qa-test-sms",
        kind: "activity",
        boxStyle: "white",
        label: "QA & Test SMS",
        colStart: 16,
        colEnd: 19,
        rowIndex: 1,
        description:
          "End-to-end QA of SMS sending including opt-in/opt-out flows, keyword responses, message rendering on target devices, and delivery confirmation.",
        stakeholders: [
          "QA team",
          "Marketing team",
          "Braze Onboarding Manager",
        ],
        documentation: [
          { name: "SMS Testing Checklist" },
          { name: "SMS Best Practices", url: "https://www.braze.com/docs/user_guide/message_building_by_channel/sms/best_practices/" },
        ],
        prepWork: [
          "Prepare test phone numbers across target carriers",
          "Create test segments",
          "Document expected opt-in/opt-out behaviour",
        ],
        learningCourses: [
          { name: "SMS Campaign Creation (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "sms-complete",
        kind: "milestone",
        boxStyle: "white",
        label: "SMS Setup Complete",
        colStart: 19,
        colEnd: 20,
        rowIndex: 1,
      },
    ],
  },

  // ── Campaign Build ───────────────────────────────────────────────────────
  {
    id: "campaign-build",
    label: "Campaign Build",
    labelBg: "#7B39A3",
    labelText: "#fff",
    rowDefs: campaign.defs,
    totalHeight: campaign.total,
    items: [
      {
        id: "build-phase1",
        kind: "activity",
        boxStyle: "blue",
        label: "Build and Launch Phase 1 Use Cases",
        colStart: 12,
        colEnd: 19,
        rowIndex: 0,
        description:
          "Design, build, QA, and launch the agreed Phase 1 campaign use cases including Canvas journeys, segmentation, personalisation, and cross-channel orchestration.",
        stakeholders: [
          "Marketing / CRM team",
          "Design team",
          "Analytics team",
          "Braze Onboarding Manager",
        ],
        documentation: [
          { name: "Canvas Flow Documentation", url: "https://www.braze.com/docs/user_guide/engagement_tools/canvas/" },
          { name: "Campaign Creation Guide", url: "https://www.braze.com/docs/user_guide/engagement_tools/campaigns/" },
        ],
        prepWork: [
          "Finalise Phase 1 use case briefs",
          "Complete creative assets and copy",
          "Define success metrics and reporting",
          "Confirm segment logic",
        ],
        learningCourses: [
          { name: "Canvas (Braze Learning)", url: "https://learning.braze.com" },
          { name: "Campaign Creation (Braze Learning)", url: "https://learning.braze.com" },
          { name: "Personalisation with Liquid (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "multi-channel-live",
        kind: "milestone",
        boxStyle: "white",
        label: "Multi Channel Journeys Live",
        colStart: 19,
        colEnd: 20,
        rowIndex: 0,
      },
      {
        id: "launch-phase2",
        kind: "activity",
        boxStyle: "blue",
        label: "Launch Phase 2 Use Cases (Optional)",
        colStart: 19,
        colEnd: 25,
        rowIndex: 0,
        description:
          "Design, build, QA, and launch additional Phase 2 use cases, expanding channel coverage, advanced personalisation, A/B testing, and more sophisticated journey orchestration.",
        stakeholders: [
          "Marketing / CRM team",
          "Design team",
          "Analytics team",
        ],
        documentation: [
          { name: "A/B Testing Guide", url: "https://www.braze.com/docs/user_guide/engagement_tools/testing/" },
          { name: "Advanced Canvas Features", url: "https://www.braze.com/docs/user_guide/engagement_tools/canvas/canvas_components/" },
        ],
        prepWork: [
          "Review Phase 1 performance and learnings",
          "Finalise Phase 2 use case briefs",
          "Prepare creative assets",
        ],
        learningCourses: [
          { name: "Advanced Canvas (Braze Learning)", url: "https://learning.braze.com" },
          { name: "A/B Testing (Braze Learning)", url: "https://learning.braze.com" },
        ],
      },
    ],
  },

  // ── Enablement ───────────────────────────────────────────────────────────
  {
    id: "enablement",
    label: "Enablement",
    labelBg: "#5A2089",
    labelText: "#fff",
    rowDefs: enablement.defs,
    totalHeight: enablement.total,
    items: [
      {
        id: "live-foundations",
        kind: "activity",
        boxStyle: "white",
        label: "Complete Live Foundations Courses",
        colStart: 1,
        colEnd: 8,
        rowIndex: 0,
        description:
          "Complete the Braze Live Foundations training series, covering the core platform fundamentals required to get started with Braze effectively.",
        stakeholders: ["All onboarding team members"],
        documentation: [
          { name: "Braze Learning Portal", url: "https://learning.braze.com" },
        ],
        prepWork: [
          "Register for Braze Learning Portal",
          "Allocate time in your schedule",
        ],
        learningCourses: [
          { name: "Braze Foundations (Live)", url: "https://learning.braze.com" },
          { name: "Platform Navigation (Live)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "on-demand-courses",
        kind: "activity",
        boxStyle: "white",
        label: "Complete On-Demand Braze Learning Courses",
        colStart: 8,
        colEnd: 19,
        rowIndex: 0,
        description:
          "Complete role-specific on-demand Braze Learning courses to build deeper platform knowledge across marketing, technical, and analytical functions.",
        stakeholders: ["All onboarding team members"],
        documentation: [
          { name: "Braze Learning Portal", url: "https://learning.braze.com" },
          { name: "Learning Path Recommendations" },
        ],
        prepWork: [
          "Identify relevant learning paths per role",
          "Schedule dedicated learning time",
        ],
        learningCourses: [
          { name: "Email Marketing in Braze (On-Demand)", url: "https://learning.braze.com" },
          { name: "SMS Marketing in Braze (On-Demand)", url: "https://learning.braze.com" },
          { name: "Canvas Deep Dive (On-Demand)", url: "https://learning.braze.com" },
          { name: "Segmentation (On-Demand)", url: "https://learning.braze.com" },
        ],
      },
      {
        id: "advanced-training",
        kind: "activity",
        boxStyle: "white",
        label: "Attend Live Advanced Instructor Led Training Sessions",
        colStart: 19,
        colEnd: 25,
        rowIndex: 0,
        description:
          "Attend live instructor-led advanced training sessions tailored to your team's specific use cases and platform maturity goals.",
        stakeholders: [
          "Marketing / CRM team",
          "Analytics team",
          "Engineering team",
        ],
        documentation: [
          { name: "Braze Learning Portal", url: "https://learning.braze.com" },
          { name: "Advanced Training Schedule" },
        ],
        prepWork: [
          "Complete on-demand prerequisites",
          "Submit topic preferences to Braze",
          "Register for scheduled sessions",
        ],
        learningCourses: [
          { name: "Advanced Canvas & Journeys (Live)", url: "https://learning.braze.com" },
          { name: "Advanced Personalisation (Live)", url: "https://learning.braze.com" },
          { name: "Reporting & Analytics Deep Dive (Live)", url: "https://learning.braze.com" },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Phase + Month header config (used by the plan header row)
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthDef {
  label: string;
  colStart: number;
  colEnd: number;
}

export interface PhaseDef {
  label: string;
  colStart: number;
  colEnd: number;
}

export const months: MonthDef[] = [
  { label: "Month 1", colStart: 1, colEnd: 8 },
  { label: "Month 2", colStart: 8, colEnd: 12 },
  { label: "Month 3", colStart: 12, colEnd: 16 },
  { label: "Month 4", colStart: 16, colEnd: 19 },
  { label: "Month 5", colStart: 19, colEnd: 22 },
  { label: "Month 6-7", colStart: 22, colEnd: 25 },
];

export const phases: PhaseDef[] = [
  { label: "Discovery & Planning", colStart: 1, colEnd: 8 },
  { label: "Execution", colStart: 8, colEnd: 22 },
  { label: "Post Go-Live Support", colStart: 22, colEnd: 25 },
];

export const TOTAL_COLS = 24;
