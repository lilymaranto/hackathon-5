import { TileLibraryEntry, TileLibraryLink } from "@/lib/types";

function sess(input: {
  description?: string;
  agenda: string[];
  attendees: string[];
  outcomes: string[];
  resources?: TileLibraryLink[];
  customer_examples?: TileLibraryLink[];
}): TileLibraryEntry {
  return {
    description: input.description ?? "",
    agenda: input.agenda,
    suggested_attendees: input.attendees,
    desired_outcomes: input.outcomes,
    resources: input.resources ?? [],
    customer_examples: input.customer_examples ?? [],
    success_checklist: [],
    strategic_impact: [],
  };
}

function act(input: {
  description: string;
  stakeholders: string[];
  documentation: TileLibraryLink[];
  courses?: TileLibraryLink[];
  customer_examples?: TileLibraryLink[];
}): TileLibraryEntry {
  return {
    description: input.description,
    agenda: [],
    suggested_attendees: input.stakeholders,
    desired_outcomes: [],
    resources: [...input.documentation, ...(input.courses ?? [])],
    customer_examples: input.customer_examples ?? [],
    success_checklist: [],
    strategic_impact: [],
  };
}

function miles(input: {
  description: string;
  success_checklist: string[];
  strategic_impact: string[];
}): TileLibraryEntry {
  return {
    description: input.description,
    agenda: [],
    suggested_attendees: [],
    desired_outcomes: [],
    resources: [],
    customer_examples: [],
    success_checklist: input.success_checklist,
    strategic_impact: input.strategic_impact,
  };
}

const DOC = (label: string, url = "#"): TileLibraryLink => ({ label, url });

/** Canonical onboarding docs / enablement titles (align with internal role–resource matrix). */
const RES = {
  userGuide: DOC("User Guide documentation"),
  developerGuide: DOC("Developer Guide documentation"),
  technicalDocs: DOC("Technical documentation"),
  emailSetup: DOC("Email Setup"),
  reportingDocs: DOC("Reporting documentation"),
  lab: DOC("Learning at Braze (LAB)"),
} as const;

export const defaultTileLibraryEntry: TileLibraryEntry = {
  description: "",
  agenda: [],
  suggested_attendees: [],
  desired_outcomes: [],
  resources: [RES.userGuide],
  customer_examples: [],
  success_checklist: [],
  strategic_impact: [],
};

/** Sheet slug → drawer content (keys match `TileRecord.Tile_ID`). */
export const TILE_LIBRARY: Record<string, TileLibraryEntry> = {
  weekly_alignment: sess({
    agenda: [
      "Project status updates and progress review",
      "Risk and issue identification within the client organisation across teams",
      "Action item review and accountability",
      "Timeline and milestone alignment",
      "Upcoming week priorities",
    ],
    attendees: [
      "Core Project Lead",
      "Braze Onboarding Manager",
      "Marketing Lead",
      "Technical Lead",
      "Braze Solutions Architect (as needed)",
    ],
    outcomes: [
      "All parties aligned on current project status",
      "Risks clearly documented with owners and mitigation plans",
      "Clear action items assigned with due dates",
      "Confidence in timeline and upcoming milestones",
    ],
  }),

  project_kick_off: sess({
    description:
      "Establish partnership goals, success criteria, ownership, and onboarding milestones.",
    agenda: [
      "Team introductions",
      "Project vision and successful delivery accountability",
      "Scope and timeline walkthrough",
      "Communication cadence and escalation path (Project Sponsor as escalation point)",
      "Q&A",
    ],
    attendees: [
      "Project Sponsor",
      "Core Project Lead",
      "Marketing Lead",
      "Technical Lead",
      "Engineering Lead(s) (Front and/or Back-end Lead)",
      "Data & Reporting Lead",
      "Braze Onboarding Manager",
      "Braze Solutions Architect",
    ],
    outcomes: [
      "Shared understanding of project scope and goals",
      "Agreed timeline and key milestones",
      "Defined communication and escalation process",
      "Team relationships established",
    ],
    resources: [RES.userGuide, RES.technicalDocs],
  }),

  platform_gov: sess({
    agenda: [
      "Workspace structure and naming conventions",
      "User roles and permission model overview",
      "SSO / SAML configuration walkthrough",
      "Data security and compliance requirements",
      "Approval workflow setup",
    ],
    attendees: [
      "IT Manager",
      "Braze Onboarding Manager",
      "Braze Solutions Architect",
    ],
    outcomes: [
      "Governance model documented and agreed",
      "Security requirements mapped to Braze configuration",
      "SSO configuration requirements captured",
      "User roles and permission structure defined",
    ],
  }),

  workbook_walkthrough: sess({
    agenda: [
      "Workbook structure and purpose",
      "Key deliverables and ownership",
      "Timeline and dependency mapping",
      "Open items and next steps",
    ],
    attendees: [
      "Core Project Lead",
      "Braze Onboarding Manager",
      "Technical Lead",
      "Marketing Lead",
    ],
    outcomes: [
      "All parties understand the workbook and their responsibilities",
      "Deliverables assigned with owners and target dates",
      "Dependencies documented",
    ],
  }),

  setup_gov_task: act({
    description:
      "Configure workspace governance settings, user roles, permissions, and security integrations including SSO/SAML, IP allowlisting, and data access controls.",
    stakeholders: ["IT Manager", "Core Project Lead"],
    documentation: [RES.userGuide, RES.technicalDocs],
    courses: [RES.lab],
  }),

  data_workshop: sess({
    agenda: [
      "Current state data architecture review",
      "User data model and identifier strategy",
      "Event taxonomy and custom attribute planning",
      "Segmentation strategy",
      "Data governance requirements",
    ],
    attendees: [
      "Data & Reporting Lead",
      "Marketing Lead",
      "Braze Solutions Architect",
      "Braze Onboarding Manager",
    ],
    outcomes: [
      "Agreed user data model and identifier strategy",
      "Event and attribute taxonomy documented",
      "Segmentation strategy defined",
      "Data governance requirements captured",
    ],
    resources: [RES.userGuide, RES.reportingDocs],
  }),

  data_planning: act({
    description:
      "Complete the campaign and data planning workbook, documenting user data schema, event taxonomy, segmentation strategy, and initial use case requirements.",
    stakeholders: ["Data & Reporting Lead", "Marketing Lead", "Braze Solutions Architect"],
    documentation: [RES.userGuide, RES.reportingDocs],
    courses: [RES.lab],
  }),

  tech_overview: sess({
    agenda: [
      "Braze architecture and infrastructure overview",
      "SDK vs. API data ingestion options",
      "Integration architecture review",
      "Q&A on technical requirements",
    ],
    attendees: [
      "Technical Lead",
      "Engineering Lead(s) (Front and/or Back-end Lead)",
      "Front End Developer",
      "Back End Developer",
      "Braze Solutions Architect",
    ],
    outcomes: [
      "Technical team understands Braze architecture",
      "Integration approach validated",
      "Key technical questions answered",
    ],
    resources: [RES.developerGuide, RES.technicalDocs],
  }),

  sdk_deep_dive: sess({
    description:
      "Technical session covering SDK initialization, user profiles, and event strategy.",
    agenda: [
      "SDK initialisation and configuration",
      "User identification and aliasing",
      "Logging custom events and attributes",
      "Push notification setup",
      "In-app messaging configuration",
    ],
    attendees: ["Front End Developer", "Braze Solutions Architect"],
    outcomes: [
      "SDK integration approach confirmed",
      "Developers have working knowledge of SDK methods",
      "Integration checklist agreed",
    ],
    resources: [RES.developerGuide],
  }),

  reporting_analytics: sess({
    agenda: [
      "Braze analytics dashboard overview",
      "Campaign and Canvas reporting",
      "Custom reporting and data export options",
      "Currents and data warehouse integration",
    ],
    attendees: ["Data & Reporting Lead", "Marketing Lead", "Braze Onboarding Manager"],
    outcomes: [
      "Reporting scope and requirements clearer for onboarding",
      "KPI tracking approach defined",
      "Data export requirements documented",
    ],
    resources: [RES.reportingDocs, RES.userGuide],
  }),

  api_deep_dive: sess({
    agenda: [
      "Braze REST API overview",
      "User track and user export endpoints",
      "Messaging trigger APIs",
      "Authentication and rate limits",
      "API testing walkthrough",
    ],
    attendees: ["Back End Developer", "Braze Solutions Architect"],
    outcomes: [
      "Team understands key API endpoints",
      "Authentication configured",
      "Integration use cases mapped to API calls",
    ],
    resources: [RES.developerGuide, RES.technicalDocs],
  }),

  qa_testing: sess({
    agenda: [
      "QA framework and testing methodology",
      "Event validation with Braze debugger",
      "SDK and API testing checklist",
      "Common integration issues and resolutions",
    ],
    attendees: ["Front End Developer", "Back End Developer", "Braze Solutions Architect"],
    outcomes: [
      "QA process defined and documented",
      "Testing checklist agreed",
      "Team confident in validation approach",
    ],
    resources: [RES.developerGuide],
  }),

  ext_id_logic: act({
    description:
      "Define and document the external user ID strategy, including the format, source system, aliasing approach for anonymous users, and migration plan from any existing identifiers.",
    stakeholders: ["Data & Reporting Lead", "Marketing Lead", "Braze Solutions Architect"],
    documentation: [RES.developerGuide, RES.userGuide],
    courses: [RES.lab],
  }),

  office_hours: sess({
    agenda: [
      "Open Q&A on technical blockers",
      "Integration review and troubleshooting",
      "Configuration guidance",
      "Best practice recommendations",
    ],
    attendees: [
      "Engineering Lead(s) (Front and/or Back-end Lead)",
      "Front End Developer",
      "Back End Developer",
      "Braze Solutions Architect",
    ],
    outcomes: [
      "Technical blockers resolved",
      "Integration progressing on schedule",
      "Team confidence maintained",
    ],
    resources: [RES.developerGuide, RES.technicalDocs],
  }),

  sdk_integration: act({
    description:
      "Implement the Braze SDK across mobile and web surfaces, integrate REST API calls for server-side data, and validate all integrations using the Braze event debugger and QA checklist.",
    stakeholders: ["Front End Developer", "Back End Developer"],
    documentation: [RES.developerGuide],
    courses: [RES.lab],
  }),

  channel_setup: act({
    description:
      "Configure push notification channels (iOS, Android, Web), in-app message display settings, Content Cards, and any additional messaging channels needed for your use cases.",
    stakeholders: ["Front End Developer", "Marketing Lead"],
    documentation: [RES.userGuide, RES.developerGuide],
    courses: [RES.lab],
  }),

  user_import: act({
    description:
      "Perform initial bulk import of existing user profiles, historical attributes, and subscription/opt-in states via CSV upload or the User Track API, ensuring data quality and compliance.",
    stakeholders: ["Data & Reporting Lead", "Marketing Lead", "Project Sponsor"],
    documentation: [RES.userGuide, RES.developerGuide],
    courses: [RES.lab],
  }),

  data_exports: act({
    description:
      "Configure Braze Currents or data export integrations to stream event-level data to your data warehouse, BI tools, or CDP for analytics and attribution.",
    stakeholders: ["Data & Reporting Lead", "Braze Solutions Architect"],
    documentation: [RES.reportingDocs, RES.technicalDocs],
    courses: [RES.lab],
  }),

  email_discovery_session: sess({
    agenda: [
      "Current email programme and ESP overview",
      "Sending domain and IP strategy",
      "List hygiene and suppression requirements",
      "Deliverability goals and current performance",
      "Template and design requirements",
    ],
    attendees: ["Marketing Lead", "IT Manager", "Braze Onboarding Manager", "Braze Deliverability Specialist"],
    outcomes: [
      "Current email programme documented",
      "Domain and IP strategy agreed",
      "Deliverability risk areas identified",
      "Template requirements captured",
    ],
    resources: [RES.userGuide, RES.emailSetup],
  }),

  email_discovery_task: sess({
    agenda: [
      "Current email programme and ESP overview",
      "Sending domain and IP strategy",
      "List hygiene and suppression requirements",
      "Deliverability goals and current performance",
      "Template and design requirements",
    ],
    attendees: ["Marketing Lead", "IT Manager", "Braze Onboarding Manager", "Braze Deliverability Specialist"],
    outcomes: [
      "Current email programme documented",
      "Domain and IP strategy agreed",
      "Deliverability risk areas identified",
      "Template requirements captured",
    ],
    resources: [RES.userGuide, RES.emailSetup],
  }),

  email_dns_ssl: act({
    description:
      "Configure sending domain DNS records (SPF, DKIM, DMARC), set up custom tracking domains with SSL, and complete the email channel configuration in Braze.",
    stakeholders: ["IT Manager", "Marketing Lead", "Braze Onboarding Manager"],
    documentation: [RES.emailSetup],
    courses: [RES.lab],
  }),

  email_templates: act({
    description:
      "Design and build responsive email templates in Braze using the drag-and-drop editor or custom HTML, including brand-compliant headers/footers, unsubscribe links, and preference centre integration.",
    stakeholders: ["Content Creator / Technical marketing User", "Marketing Lead", "Braze Onboarding Manager"],
    documentation: [RES.userGuide],
    courses: [RES.lab],
  }),

  pre_ip_warming: sess({
    agenda: [
      "IP warming process and timeline overview",
      "Volume ramp schedule planning",
      "Segment selection strategy for warm-up sends",
      "Monitoring metrics and success criteria",
      "Escalation plan if deliverability issues arise",
    ],
    attendees: ["Marketing Lead", "Braze Onboarding Manager", "Braze Deliverability Specialist"],
    outcomes: [
      "IP warming schedule agreed and documented",
      "Segment strategy for warm-up confirmed",
      "Monitoring plan in place",
      "Team confident to execute warm-up",
    ],
    resources: [RES.emailSetup, RES.userGuide],
  }),

  launch_ip_warming: act({
    description:
      "Execute the agreed IP warming schedule, gradually increasing send volume while monitoring deliverability metrics (inbox rates, bounces, spam complaints) and adjusting as needed.",
    stakeholders: ["Marketing Lead", "Braze Onboarding Manager", "Braze Deliverability Specialist"],
    documentation: [RES.emailSetup],
    courses: [RES.lab],
  }),

  ip_warming_plan: act({
    description:
      "Define the sender reputation ramp and delivery milestones to support launch readiness. Document the detailed IP warming plan including volume ramp schedule, segment selection criteria, daily send targets, and monitoring KPIs.",
    stakeholders: ["Marketing Lead", "Braze Deliverability Specialist"],
    documentation: [RES.emailSetup, RES.userGuide],
    courses: [RES.lab],
  }),

  sms_discovery_session: sess({
    agenda: [
      "SMS programme goals and use cases",
      "Sender type selection (long code, short code, toll-free)",
      "Geographic and carrier requirements",
      "Compliance and opt-in requirements (TCPA, CTIA)",
      "Integration with opt-in flows",
    ],
    attendees: ["Marketing Lead", "Project Sponsor", "Braze Onboarding Manager", "Braze SMS Specialist"],
    outcomes: [
      "SMS strategy and use cases documented",
      "Sender type(s) confirmed",
      "Compliance requirements captured",
      "Opt-in flow approach agreed",
    ],
    resources: [RES.userGuide],
  }),

  sms_discovery_task: sess({
    agenda: [
      "SMS programme goals and use cases",
      "Sender type selection (long code, short code, toll-free)",
      "Geographic and carrier requirements",
      "Compliance and opt-in requirements (TCPA, CTIA)",
      "Integration with opt-in flows",
    ],
    attendees: ["Marketing Lead", "Project Sponsor", "Braze Onboarding Manager", "Braze SMS Specialist"],
    outcomes: [
      "SMS strategy and use cases documented",
      "Sender type(s) confirmed",
      "Compliance requirements captured",
      "Opt-in flow approach agreed",
    ],
    resources: [RES.userGuide],
  }),

  sms_long_code: act({
    description:
      "Obtain and configure a test long code number within Braze for development and QA purposes prior to production sender provisioning.",
    stakeholders: ["Engineering Lead(s) (Front and/or Back-end Lead)", "Braze Onboarding Manager"],
    documentation: [RES.userGuide, RES.technicalDocs],
    courses: [RES.lab],
  }),

  sms_sender_app: act({
    description:
      "Complete the carrier sender application including business registration, use case description, message samples, and opt-in flow documentation. Review and validate opt-in flows meet TCPA/CTIA compliance standards.",
    stakeholders: ["Marketing Lead", "Project Sponsor", "Braze Onboarding Manager"],
    documentation: [RES.userGuide],
    courses: [RES.lab],
  }),

  sms_approvals: sess({
    agenda: [
      "Carrier registration status updates",
      "Pending application review items",
      "Timeline management",
    ],
    attendees: ["Braze Onboarding Manager", "Core Project Lead"],
    outcomes: [
      "Sender approved and provisioned",
      "SMS subscription groups configured",
      "Ready to proceed to SMS enablement",
    ],
  }),

  sms_enablement: sess({
    agenda: [
      "SMS subscription group configuration",
      "Keyword handling setup (STOP, HELP, START)",
      "MMS configuration (if applicable)",
      "Liquid personalisation in SMS",
      "Building and testing your first SMS campaign",
    ],
    attendees: [
      "Marketing Lead",
      "Engineering Lead(s) (Front and/or Back-end Lead)",
      "Braze Onboarding Manager",
    ],
    outcomes: [
      "SMS fully configured in Braze",
      "Keyword responses set up",
      "Team able to build and send SMS campaigns",
    ],
    resources: [RES.userGuide],
  }),

  sms_qa: act({
    description:
      "End-to-end QA of SMS sending including opt-in/opt-out flows, keyword responses, message rendering on target devices, and delivery confirmation.",
    stakeholders: ["Marketing Lead", "Marketing End User", "Braze Onboarding Manager"],
    documentation: [RES.userGuide],
    courses: [RES.lab],
  }),

  whatsapp_discovery: sess({
    agenda: [
      "WhatsApp programme goals and supported use cases",
      "WhatsApp Business Account (WABA) ownership and Meta Business Manager alignment",
      "Opt-in and consent requirements for WhatsApp messaging",
      "Integration points with Braze and customer data flows",
      "Timeline and dependencies vs. SMS and other channels",
    ],
    attendees: ["Marketing Lead", "Project Sponsor", "Core Project Lead", "Braze Onboarding Manager"],
    outcomes: [
      "WhatsApp scope and use cases documented",
      "WABA ownership and escalation path understood",
      "Compliance and opt-in expectations captured",
      "Clear next steps toward WABA provisioning",
    ],
    resources: [RES.userGuide],
  }),

  waba_walkthrough: sess({
    agenda: [
      "End-to-end WABA lifecycle (creation, verification, phone numbers)",
      "Meta Business Manager roles and access requirements",
      "Display name, quality rating, and throughput considerations",
      "How Braze connects to your WABA",
      "Open questions and action owners",
    ],
    attendees: ["Core Project Lead", "Marketing Lead", "Engineering Lead(s) (Front and/or Back-end Lead)", "Braze Onboarding Manager"],
    outcomes: [
      "Team understands WABA steps and timelines",
      "Roles for Meta vs. client vs. Braze clarified",
      "Risks and blockers logged with owners",
    ],
    resources: [RES.userGuide, RES.technicalDocs],
  }),

  acquire_waba: act({
    description:
      "Complete Meta Business Manager setup, WABA creation or linkage, phone number acquisition, and any verification steps required so WhatsApp sending can be enabled in Braze.",
    stakeholders: ["Core Project Lead", "Marketing Lead", "Engineering Lead(s) (Front and/or Back-end Lead)", "Braze Onboarding Manager"],
    documentation: [RES.userGuide, RES.technicalDocs],
    courses: [RES.lab],
  }),

  wa_optin_campaign: act({
    description:
      "Design and launch acquisition flows and campaigns that collect compliant WhatsApp opt-ins (e.g. QR, web forms, keywords), sync subscribers into Braze, and validate subscription states before production sends.",
    stakeholders: ["Marketing Lead", "Marketing End User", "Content Creator / Technical marketing User", "Braze Onboarding Manager"],
    documentation: [RES.userGuide],
    courses: [RES.lab],
  }),

  wa_templates: act({
    description:
      "Create and submit WhatsApp message templates in WhatsApp Manager (utility, marketing, authentication as applicable), align copy with approval policies, and map approved templates to Braze campaigns or Canvases.",
    stakeholders: ["Marketing Lead", "Content Creator / Technical marketing User", "Braze Onboarding Manager"],
    documentation: [RES.userGuide],
    courses: [RES.lab],
  }),

  whatsapp_complete: miles({
    description:
      "WhatsApp is provisioned, templates are approved where needed, and opt-in journeys are ready so regulated WhatsApp outreach can scale safely alongside other channels.",
    success_checklist: [
      "WABA connected with numbers and Braze channel configuration signed off",
      "Opt-in flows and subscription states validated for production use",
      "Approved templates available for agreed use cases; QA completed on target devices",
    ],
    strategic_impact: [
      "Adds a high-intent messaging surface with clear compliance guardrails",
      "Aligns marketing and technical owners on WhatsApp lifecycle before broad rollout",
    ],
  }),

  phase_1_build: act({
    description:
      "Design, build, QA, and launch the agreed Phase 1 campaign use cases including Canvas journeys, segmentation, personalisation, and cross-channel orchestration.",
    stakeholders: [
      "Marketing Lead",
      "Marketing End User",
      "Content Creator / Technical marketing User",
      "Data & Reporting Lead",
      "Braze Onboarding Manager",
    ],
    documentation: [RES.userGuide],
    courses: [RES.lab],
  }),

  phase_2_optional: act({
    description:
      "Design, build, QA, and launch additional Phase 2 use cases, expanding channel coverage, advanced personalisation, A/B testing, and more sophisticated journey orchestration.",
    stakeholders: [
      "Marketing Lead",
      "Content Creator / Technical marketing User",
      "Data & Reporting Lead",
    ],
    documentation: [RES.userGuide],
    courses: [RES.lab],
  }),

  foundations_live: act({
    description:
      "Complete the Braze Live Foundations training series, covering the core platform fundamentals required to get started with Braze effectively.",
    stakeholders: [
      "Marketing End User",
      "Marketing Lead",
      "Core Project Lead",
      "Front End Developer",
      "Back End Developer",
    ],
    documentation: [RES.lab, RES.userGuide],
  }),

  ondemand_learning: act({
    description:
      "Complete role-specific on-demand Braze Learning courses to build deeper platform knowledge across marketing, technical, and analytical functions.",
    stakeholders: [
      "Marketing End User",
      "Marketing Lead",
      "Technical Lead",
      "Data & Reporting Lead",
      "Front End Developer",
      "Back End Developer",
    ],
    documentation: [RES.lab, RES.userGuide, RES.developerGuide, RES.reportingDocs],
  }),

  advanced_training: act({
    description:
      "Attend live instructor-led advanced training sessions tailored to your team's specific use cases and platform maturity goals.",
    stakeholders: ["Marketing Lead", "Data & Reporting Lead", "Engineering Lead(s) (Front and/or Back-end Lead)"],
    documentation: [RES.lab, RES.reportingDocs, RES.userGuide],
  }),

  dash_complete: miles({
    description:
      "Governance and workspace security foundations are in place so teams can operate Braze with clear ownership and controls.",
    success_checklist: [
      "Workspace roles and permissions reflect the agreed governance model",
      "SSO / SAML or equivalent security requirements validated where applicable",
      "Core stakeholders can access the dashboard and required workspaces",
    ],
    strategic_impact: [
      "Lowers operational and compliance risk before scaling messaging volume",
      "Aligns IT, marketing, and Braze on who can change data and campaigns",
    ],
  }),

  data_complete: miles({
    description:
      "Campaign and data planning artefacts are signed off so events, attributes, and segments support launch use cases.",
    success_checklist: [
      "User identifier strategy and event taxonomy documented and approved",
      "Initial segments and data governance notes captured in the workbook",
      "Data & Reporting Lead and Marketing Lead confirm the plan supports reporting needs",
    ],
    strategic_impact: [
      "Unlocks reliable personalisation and measurement across channels",
      "Avoids costly rework from inconsistent data definitions later in onboarding",
    ],
  }),

  tech_complete: miles({
    description:
      "Technical integrations are validated end-to-end so channels can receive trustworthy user and engagement data.",
    success_checklist: [
      "SDK / API integrations pass agreed QA and debugger validation",
      "Mobile and web channels configured for the MVP journey scope",
      "Data exports or Currents destinations configured where required",
    ],
    strategic_impact: [
      "Provides a stable pipe for orchestration, experimentation, and attribution",
      "Reduces launch delays caused by integration gaps or bad event quality",
    ],
  }),

  email_complete: miles({
    description:
      "Email channel setup and warming milestones are met so production sends can scale safely.",
    success_checklist: [
      "DNS, SSL, and Braze email configuration signed off by stakeholders",
      "IP warming plan executed against agreed volume and segment targets",
      "Templates and preference centre behaviour reviewed for compliance",
    ],
    strategic_impact: [
      "Protects sender reputation while scaling revenue-critical email programmes",
      "Establishes repeatable deliverability rituals for the marketing team",
    ],
  }),

  sms_complete: miles({
    description:
      "SMS is provisioned, compliant, and tested so regulated outreach can go live with confidence.",
    success_checklist: [
      "Approved sender(s) live with subscription groups and keywords configured",
      "Opt-in / opt-out flows reviewed against TCPA / CTIA expectations",
      "End-to-end QA completed on target devices and carriers",
    ],
    strategic_impact: [
      "Opens a high-engagement channel without exposing compliance risk",
      "Sets the foundation for SMS alongside email and push orchestration",
    ],
  }),

  journeys_live: miles({
    description:
      "Phase 1 journeys and campaigns are live in production, marking the shift from build to optimise.",
    success_checklist: [
      "Agreed Phase 1 Canvases / campaigns deployed with monitoring in place",
      "Success metrics and ownership defined for in-flight journeys",
      "Hypercare / rollback expectations documented with Braze and Core Project Lead",
    ],
    strategic_impact: [
      "Delivers measurable customer impact from the onboarding investment",
      "Creates momentum for Phase 2 experimentation and channel expansion",
    ],
  }),

  ads_ms_kickoff: miles({
    description:
      "Align sponsors and delivery leads on AI Decisioning Studio scope, cadence, and ownership.",
    success_checklist: [
      "Project charter and escalation path confirmed",
      "Core roster mapped to roles (champion, coordinator, SMEs)",
      "First milestones and readout rhythm agreed",
    ],
    strategic_impact: [
      "Establishes clear sponsorship before technical delivery accelerates",
      "Surfaces dependency risks early while timelines are still flexible",
    ],
  }),

  ads_ms_design_finalized: miles({
    description:
      "Design choices for use case, audience, signals, and guardrails are signed off before build.",
    success_checklist: [
      "Use case narrative and success metric documented",
      "Signal catalogue and eligibility rules validated",
      "Creative / treatment assumptions aligned with marketing governance",
    ],
    strategic_impact: ["Reduces rework during integration and experimentation phases."],
  }),

  ads_ms_golive_random: miles({
    description: "Decisioning experiences serving stochastic / exploration allocations go live.",
    success_checklist: [
      "Allocation logic validated in staging against QA checklist",
      "Monitoring hooks and rollback triggers confirmed",
      "Hypercare owners assigned for first production weeks",
    ],
    strategic_impact: ["Unlocks measurable learning velocity without compromising guardrails."],
  }),

  ads_ms_golive_trained: miles({
    description:
      "Decisioning experiences leveraging trained models or deterministic policies go live.",
    success_checklist: [
      "Model cards / policy docs reviewed with analysts",
      "Offline evaluation thresholds met for promotion",
      "Operational dashboards wired for drift and performance alerts",
    ],
    strategic_impact: ["Moves optimised decisions into durable revenue workflows."],
  }),

  ads_ms_results_readout: miles({
    description:
      "Executive review of AI Decisioning Studio outcomes against charter metrics and learnings.",
    success_checklist: [
      "Readout deck circulated with statistically framed lift summaries",
      "Follow-on backlog prioritized with champion sign-off",
      "Budget / resourcing implications captured for next horizon",
    ],
    strategic_impact: ["Closes the loop from experiment to funded roadmap."],
  }),

  ads_lane1_design_use_case: act({
    description:
      "Shape the decisioning use case, audiences, signals, and measurement plan prior to studio configuration.",
    stakeholders: [],
    documentation: [RES.userGuide, RES.reportingDocs],
  }),

  ads_lane1_configure_ads: sess({
    description:
      "Configure Braze AI Decisioning Studio™ environments, guardrails, and foundations for the agreed use case.",
    agenda: [
      "Workspace setup and access governance",
      "Use case binding: audiences, eligibility, and constraints",
      "Integration touchpoints with activation and data feeds",
      "Validation checkpoints with SMEs before iterative build",
    ],
    attendees: [],
    outcomes: [
      "Studio configuration matches signed-off design artefacts",
      "Clear owners for ongoing configuration changes",
      "Risks / dependencies logged with mitigation owners",
    ],
  }),

  ads_lane1_iteration: act({
    description:
      "Iterate treatments, signals, and QA cycles until performance readiness gates are satisfied.",
    stakeholders: [],
    documentation: [RES.userGuide, RES.lab],
  }),

  ads_lane1_tune_performance: sess({
    description:
      "Post–go-live tuning of AI Decisioning Studio policies, allocations, and optimisation levers.",
    agenda: [
      "Review live diagnostics vs charter KPIs",
      "Prioritise tuning backlog (creative, targeting, model thresholds)",
      "Agree experimentation guardrails for subsequent cycles",
    ],
    attendees: [],
    outcomes: [
      "Documented tuning roadmap with owners",
      "Performance anomalies triaged with mitigation timelines",
      "Executive visibility on ROI trajectory",
    ],
  }),

  ads_lane2_marketing_assets: act({
    description:
      "Produce marketing assets and option bank variants required for AI Decisioning treatments.",
    stakeholders: [],
    documentation: [RES.userGuide],
  }),

  ads_lane2_pre_golive_test: sess({
    description:
      "Structured QA cycles covering eligibility, rendering, and instrumentation prior to production.",
    agenda: [
      "Test case walkthrough with marketing + activation SMEs",
      "Regression checklist for APIs / journey hand-offs",
      "Sign-off criteria vs blocking defects",
    ],
    attendees: [],
    outcomes: [
      "QA summary archived with pass / fail evidence",
      "Show-stopper defects resolved or explicitly waived",
      "Go-live readiness memo circulated",
    ],
  }),

  ads_lane2_post_golive_test: sess({
    description:
      "Hypercare testing immediately after launch to validate stability and customer experience.",
    agenda: [
      "Smoke tests across activation surfaces",
      "Monitoring review (latency, errors, allocation splits)",
      "Issue triage cadence through stabilization window",
    ],
    attendees: [],
    outcomes: [
      "Production defects categorized and owned",
      "Rollback criteria validated",
      "Transition plan from hypercare to steady-state ops",
    ],
  }),

  ads_lane3_activation_channels: act({
    description:
      "Wire Braze AI Decisioning Studio outputs into downstream activation channels and journeys.",
    stakeholders: [],
    documentation: [RES.developerGuide, RES.technicalDocs],
  }),

  ads_lane4_data_feed: act({
    description:
      "Discover required attributes / events and implement recurring data feeds powering decisioning models.",
    stakeholders: [],
    documentation: [RES.technicalDocs, RES.reportingDocs],
  }),
};

const TILE_LIBRARY_ALIASES: Record<string, string> = {
  platform_gov_security: "platform_gov",
  project_workbook: "workbook_walkthrough",
  weekly_office_hours: "office_hours",
  launch_phase_2: "phase_2_optional",
  setup_gov_security: "setup_gov_task",
  dashboard_complete: "dash_complete",
  data_planning_workshops: "data_workshop",
  data_planning_task: "data_planning",
  data_planning_complete: "data_complete",
  external_id_logic: "ext_id_logic",
  integrate_sdks_apis: "sdk_integration",
  user_data_import: "user_import",
  mobile_web_channels: "channel_setup",
  tech_int_complete: "tech_complete",
  build_launch_phase_1: "phase_1_build",
  launch_phase_2_optional: "phase_2_optional",
  email_config: "email_dns_ssl",
  email_setup_complete: "email_complete",
  sms_approval_process: "sms_approvals",
  sms_setup_complete: "sms_complete",
  test_long_code: "sms_long_code",
  qa_test_sms: "sms_qa",
  live_foundations: "foundations_live",
};

export function tileLibraryKey(storedTileId: string): string {
  const sep = "__";
  const i = storedTileId.indexOf(sep);
  const baseKey = i === -1 ? storedTileId : storedTileId.slice(i + sep.length);
  return TILE_LIBRARY_ALIASES[baseKey] ?? baseKey;
}

export function getTileLibraryEntry(tileId: string): TileLibraryEntry {
  const base = TILE_LIBRARY[tileLibraryKey(tileId)] ?? defaultTileLibraryEntry;
  return {
    description: base.description,
    agenda: base.agenda,
    suggested_attendees: base.suggested_attendees,
    desired_outcomes: base.desired_outcomes,
    resources: base.resources,
    customer_examples: base.customer_examples,
    success_checklist: base.success_checklist,
    strategic_impact: base.strategic_impact,
  };
}
