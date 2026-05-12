Architecture Document: Braze Dynamic Onboarding Canvas
1. Project Vision & Tech Stack
Vision: Transition the Braze onboarding experience from static slides to an interactive, dynamic "Miro-style" workspace. Braze employees can customize timelines in real-time, while clients (Guests) can access a read-only, resource-rich version of their specific plan via a simple password.
Framework: Next.js (React)
Authentication: NextAuth.js (Google Provider for Employees)
Drag & Drop: @dnd-kit/core (Handles grid-snapping and logic)
Styling: Tailwind CSS
Database/Backend: Caboodle API Studio (Google Sheets REST API)

2. Brand Identity & UI System
A. Braze Color Palette
The application must strictly adhere to these brand colors:
Primary: Orange #FFA524, Pink #FFA4FB, Purple #801ED7
Secondary: Light Orange #FFD4BC, Red #E9371F, Light Pink #F8D3E8, Dark Pink #91186E, Light Purple #C9C4EF, Dark Purple #300266
B. Tile & Canvas Design Rules
The Canvas: Static grid background (#FFFFFF with subtle #C9C4EF grid lines). X-axis = Weeks, Y-axis = Workstreams.
Onboarding Session Tiles: Background: Dark Purple (#300266), Text: White.
Customer Activity Tiles: Background: Light Purple (#C9C4EF), Border: 2px solid Purple (#801ED7), Text: Dark Purple.
Milestone Tiles: Rendered as a Pink (#FFA4FB) Star Icon instead of a box.
Overlaps: If multiple tiles occupy the same week in the same row, stack them vertically using flexbox (flex-col).

Timeline Header Definitions:
- Growth Silver (6 weeks): Phases = Discovery & Planning (2), Execution (3), Post Go-Live Support (1); months row hidden; week labels render as "Week X".
- Quickstart Silver / Ignite Silver (6 weeks): Same phases as Growth Silver; months = Month 1 (2), Month 2 (2), Month 3 (2); week labels render as "W1..W6".
- 12 week: Phases = Discovery & Planning (4), Execution (6), Post Go-Live Support (2); months = Month 1 (4), Month 2 (4), Month 3 (4).
- Quickstart Gold (18 weeks): Phases = Discovery & Planning (6), Execution (8), Post Go-Live Support (4); months = Month 1–4 (4 weeks each), Month 5 (2 weeks).
- Ignite Gold (20 weeks): Phases = Discovery & Planning (7), Execution (9), Post Go-Live Support (4); months = Month 1–5 (4 weeks each); canvas timeline = **20 columns** (4 per month).

C. The Detail Drawer (Slide-Out)
When a tile is clicked, a panel triggers:
Slides out from the Right Hand Side.
Close Button: An "X" icon in the top right.
Sections:
Title: Large bold text.
What we cover: Summary (pulled from hardcoded Library).
Resources: Heading with bulleted links.
Case Studies: Filtered dynamically based on Industry + Duration_Weeks + Product_Type.

3. Database & API Specification (Caboodle API)
A. Endpoints & Authentication
Configs API: https://soleng-caboodle-sheets-e2eca0cb7cdb.herokuapp.com/api/v1/ALRKKYeY
Tiles API: https://soleng-caboodle-sheets-e2eca0cb7cdb.herokuapp.com/api/v1/PLLzcDoN
Auth Requirement: All requests (GET, POST, PATCH) must include the API key in the headers: Authorization: Bearer [YOUR_API_KEY] or X-API-Key: [YOUR_API_KEY]
Rate Limits: 100 requests per minute per IP.
B. Table Schemas
Table 1: Configs
Config_ID: Unique ID (Slug or UUID)
Title: Account name (e.g., "Nike")
Product_Type: Enum dropdown: "Braze Core" | "AI Decisioning Studio"
Duration_Weeks: Enum dropdown: 6 | 12 | 18 | 20 (20 used for Ignite Gold)
Industry: Enum dropdown: Retail & eCommerce | QSR | Media, Gaming, and Entertainment | Financial Services | Healthcare & Life Sciences | Other
Password: Auto-generated fallback: title.toLowerCase().replace(/\s/g, '')
Created_By: Braze Employee Email
Last_Saved: Timestamp
Table 2: Tiles
Column order: **ID**, **Title_ID**, **Config_ID**, **Workstream**, **Title**, **Start_Week**, **Span_Weeks**, **Stack_Order**, **Category**.
ID: Unique row key — PATCH and DELETE always use this column (**`{Config_ID}__{slug}`**).
Title_ID: Slug matching constants templates (maps to app **`TileRecord.Tile_ID`** for library/drawer). Legacy sheet column **Tile_ID** still read if present.
Config_ID: Foreign key to configs (**Config_ID** on configs sheet); used for GET list and bulk deletes.
Workstream, Title, Start_Week, Span_Weeks, Stack_Order (per-lane stacking when tiles overlap in time), Category.

GET tiles: **`Config_ID[eq]{config id}`** (override header via **`CABOODLE_TILES_CONFIG_ID_COLUMN`** if needed). Legacy sheets without **Config_ID** could fall back to **`ID[startsWith]{Config_ID}__`** manually during migration.

Caboodle Studio — enable PATCH/DELETE: **Configs** endpoint **ID Column** → **Config_ID**. **Tiles** endpoint **ID Column** → **ID**.
C. Querying Data (Caboodle Syntax)
Fetching a specific config via password: GET /api/v1/ALRKKYeY?filter=Password[eq]enteredpassword
Fetching tiles for a config: GET /api/v1/PLLzcDoN?filter=Config_ID[eq]nike-abc12
Updating a tile position (PATCH): row key must match tiles sheet column **ID**, e.g. `{ "id": "nike-abc__sdk_deep_dive", "ID": "nike-abc__sdk_deep_dive", "Start_Week": 5, "Workstream": "tech" }` (keys match Caboodle ID Column + fields to change).
Deleting tiles (config delete flow): GET tiles with **`Config_ID[eq]`**, then **DELETE** with JSON body **`{ "id": "<comma-separated row IDs>", "ID": "<same>" }`** when Caboodle accepts bulk removal; if that fails, the app falls back to one JSON DELETE per tile **with a default ~2.5s gap** between calls to reduce Google Sheets **read quota** bursts. On quota errors it **waits ~62s** and retries (up to several attempts). Tune with **`CABOODLE_DELETE_TILE_GAP_MS`** and **`CABOODLE_SHEETS_QUOTA_BACKOFF_MS`**. Config row DELETE uses **`?id={Config_ID}`** only (no extra configs GET). **`DELETE /api/configs/[configId]`** sets **`maxDuration = 300`** for long-running paced deletes.




4. Application Workflows
A. Editor View (Braze Employees)
Must log in with @braze.com via NextAuth Google Provider.
Has access to a Global Search bar utilizing Caboodle filtering: ?filter=Title[contains]Query
Can click "Create Config" from the All Configs header action. This opens a right-side slide-over panel.
Create Config form includes dropdowns for Product_Type, Duration_Weeks, and Industry.
This triggers a POST to the Configs table, followed by a bulk POST of seeded tile data selected by Plan_Option (`growth_silver`, `quickstart_silver`, `ignite_silver`, `12_week`, `quickstart_gold`, `ignite_gold`).
Canvas Editing: yes allows dragging tiles across the grid. A "Save Layout" button in the header fires PATCH requests to Caboodle for any tiles whose Start_Week or Workstream changed.
B. Guest View (Clients)
"I'm a Guest" button leads to a single password input.
Frontend logic queries the Configs API using ?filter=Password[eq]Input.
If found, redirects to the canvas route.
Read-Only: Drag handles are disabled (pointer-events: none). Tiles can be clicked to open the Slide-Out Drawer.
C. Config Management UX Updates (Employee)
Create/Edit Config Form:
- Include a "Generate Random Password" button.
- Generated password must be max 8 characters.
- If password is generated via this button, show a "Copy Password" button in that config view.

All Configs Page (Employee List View):
- Each config row must include icon actions:
  1) Key icon = Copy Password
  2) Pencil icon = Edit Config
  3) Arrow icon = Go To Config
- On hover, each icon must show a tooltip label describing its action.

5. Static Content Library (In-Code)
To prevent database bloat, tile descriptions and resources are hardcoded in the Next.js app. Cursor should generate basic boilerplate for all 40+ slugs based on this pattern:
JavaScript
const TILE_LIBRARY = {
  project_kick_off: {
    what_we_cover: "Establishing the partnership, defining key stakeholders, and outlining primary business goals for the Braze implementation.",
    resources: [{ label: "Kick-Off Deck Template", url: "#" }],
    case_studies: []
  },
  sdk_deep_dive: {
    what_we_cover: "Technical session covering SDK initialization, user profiling, and tracking custom attributes.",
    resources: [{ label: "SDK Integration Docs", url: "#" }],
    case_studies: []
  },
  ip_warming_plan: {
    what_we_cover: "Strategizing the gradual increase of email volume to build sender reputation with ISPs.",
    resources: [{ label: "IP Warming Best Practices", url: "#" }],
    case_studies: []
  }
  // ... Developer to populate remaining slugs.
};

6. Complete Seed Data: 12-Week Default Template
When a user creates a new 12-week configuration, the app must generate unique UIDs and inject the new Config_ID, then POST this complete array to the Tiles API (PLLzcDoN).
JSON
[
  { "Tile_ID": "weekly_alignment", "Workstream": "governance", "Title": "Weekly Project Management Alignment Calls", "Start_Week": 1, "Span_Weeks": 12, "Category": "onboarding_session" },
  { "Tile_ID": "project_kick_off", "Workstream": "governance", "Title": "Project Kick-Off", "Start_Week": 1, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "platform_gov", "Workstream": "governance", "Title": "Platform Governance & Security", "Start_Week": 2, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "workbook_walkthrough", "Workstream": "governance", "Title": "Project Workbook Walkthrough", "Start_Week": 3, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "setup_gov_task", "Workstream": "governance", "Title": "Setup Governance & Security", "Start_Week": 4, "Span_Weeks": 1, "Category": "customer_activity" },
  { "Tile_ID": "dash_complete", "Workstream": "governance", "Title": "Dashboard Setup Complete", "Start_Week": 4, "Span_Weeks": 1, "Category": "milestone" },
  { "Tile_ID": "data_workshop", "Workstream": "data", "Title": "Campaign & Data Planning Workshops", "Start_Week": 1, "Span_Weeks": 4, "Category": "onboarding_session" },
  { "Tile_ID": "data_planning", "Workstream": "data", "Title": "Campaign & Data Planning", "Start_Week": 1, "Span_Weeks": 4, "Category": "customer_activity" },
  { "Tile_ID": "data_complete", "Workstream": "data", "Title": "Campaign and Data Planning Complete", "Start_Week": 4, "Span_Weeks": 1, "Category": "milestone" },
  { "Tile_ID": "tech_overview", "Workstream": "tech", "Title": "Tech Overview", "Start_Week": 3, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "sdk_deep_dive", "Workstream": "tech", "Title": "SDK Deep Dive", "Start_Week": 4, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "reporting_analytics", "Workstream": "tech", "Title": "Reporting & Analytics", "Start_Week": 5, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "api_deep_dive", "Workstream": "tech", "Title": "API Deep Dive", "Start_Week": 6, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "qa_testing", "Workstream": "tech", "Title": "QA & Testing", "Start_Week": 7, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "office_hours", "Workstream": "tech", "Title": "Weekly Office Hours (Optional)", "Start_Week": 4, "Span_Weeks": 6, "Category": "onboarding_session" },
  { "Tile_ID": "ext_id_logic", "Workstream": "tech", "Title": "Define External ID Logic", "Start_Week": 3, "Span_Weeks": 3, "Category": "customer_activity" },
  { "Tile_ID": "sdk_integration", "Workstream": "tech", "Title": "Integrate & QA SDKs & APIs", "Start_Week": 5, "Span_Weeks": 3, "Category": "customer_activity" },
  { "Tile_ID": "channel_setup", "Workstream": "tech", "Title": "Setup Mobile/Web Channels", "Start_Week": 8, "Span_Weeks": 2, "Category": "customer_activity" },
  { "Tile_ID": "user_import", "Workstream": "tech", "Title": "Import User Data & Subscription States", "Start_Week": 5, "Span_Weeks": 3, "Category": "customer_activity" },
  { "Tile_ID": "data_exports", "Workstream": "tech", "Title": "Setup Data Exports", "Start_Week": 8, "Span_Weeks": 2, "Category": "customer_activity" },
  { "Tile_ID": "tech_complete", "Workstream": "tech", "Title": "Technical Integration Complete", "Start_Week": 10, "Span_Weeks": 1, "Category": "milestone" },
  { "Tile_ID": "email_discovery_session", "Workstream": "email", "Title": "Email Discovery Workshop", "Start_Week": 2, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "email_discovery_task", "Workstream": "email", "Title": "Email Discovery Workshop", "Start_Week": 2, "Span_Weeks": 1, "Category": "customer_activity" },
  { "Tile_ID": "email_dns_ssl", "Workstream": "email", "Title": "Setup Email Config (DNS & SSL)", "Start_Week": 3, "Span_Weeks": 1, "Category": "customer_activity" },
  { "Tile_ID": "email_templates", "Workstream": "email", "Title": "Build Email Templates", "Start_Week": 4, "Span_Weeks": 4, "Category": "customer_activity" },
  { "Tile_ID": "ip_warming_plan", "Workstream": "email", "Title": "Plan IP Warming", "Start_Week": 4, "Span_Weeks": 4, "Category": "customer_activity" },
  { "Tile_ID": "pre_ip_warming", "Workstream": "email", "Title": "Pre IP Warming Workshop", "Start_Week": 8, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "launch_ip_warming", "Workstream": "email", "Title": "Launch IP Warming", "Start_Week": 9, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "email_complete", "Workstream": "email", "Title": "Email Setup Complete", "Start_Week": 9, "Span_Weeks": 1, "Category": "milestone" },
  { "Tile_ID": "sms_discovery_session", "Workstream": "sms", "Title": "SMS Discovery Workshop", "Start_Week": 1, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "sms_discovery_task", "Workstream": "sms", "Title": "SMS Discovery Workshop", "Start_Week": 1, "Span_Weeks": 1, "Category": "customer_activity" },
  { "Tile_ID": "sms_long_code", "Workstream": "sms", "Title": "Test Long Code Secured", "Start_Week": 2, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "sms_sender_app", "Workstream": "sms", "Title": "Prepare Sender Application", "Start_Week": 3, "Span_Weeks": 1, "Category": "customer_activity" },
  { "Tile_ID": "sms_approvals", "Workstream": "sms", "Title": "Additional Sender Approval Process", "Start_Week": 4, "Span_Weeks": 6, "Category": "onboarding_session" },
  { "Tile_ID": "sms_enablement", "Workstream": "sms", "Title": "SMS Enablement", "Start_Week": 8, "Span_Weeks": 2, "Category": "onboarding_session" },
  { "Tile_ID": "sms_qa", "Workstream": "sms", "Title": "QA & Test SMS", "Start_Week": 10, "Span_Weeks": 1, "Category": "onboarding_session" },
  { "Tile_ID": "sms_complete", "Workstream": "sms", "Title": "SMS Setup Complete", "Start_Week": 11, "Span_Weeks": 1, "Category": "milestone" },
  { "Tile_ID": "phase_1_build", "Workstream": "campaign", "Title": "Build and Launch Phase 1 Use Cases", "Start_Week": 8, "Span_Weeks": 3, "Category": "customer_activity" },
  { "Tile_ID": "journeys_live", "Workstream": "campaign", "Title": "Multi Channel Journeys Live", "Start_Week": 11, "Span_Weeks": 1, "Category": "milestone" },
  { "Tile_ID": "phase_2_optional", "Workstream": "campaign", "Title": "Launch Phase 2 Use Cases (Optional)", "Start_Week": 12, "Span_Weeks": 1, "Category": "customer_activity" },
  { "Tile_ID": "foundations_live", "Workstream": "enablement", "Title": "Complete Live Foundations Courses", "Start_Week": 1, "Span_Weeks": 4, "Category": "customer_activity" },
  { "Tile_ID": "ondemand_learning", "Workstream": "enablement", "Title": "Complete On-Demand Braze Courses", "Start_Week": 5, "Span_Weeks": 4, "Category": "customer_activity" },
  { "Tile_ID": "advanced_training", "Workstream": "enablement", "Title": "Attend Live Advanced Training", "Start_Week": 9, "Span_Weeks": 3, "Category": "customer_activity" }
]

7. Future-Proofing (Plan-Specific Timelines)
The architecture uses a plan-first configuration model:
- `TIMELINE_CONFIGS` controls phase and month headers by `planOptionId`.
- `getSeedTemplate(planOptionId)` controls tile payloads (including `Stack_Order`) by plan family (`silver`, `12_week`, `gold`).
- Duration still controls grid width, but header structure and tiles are selected by plan id.

Case Study Mapping:
A JSON mapping object in code will resolve case studies using the 3-variable key:
- Industry
- Duration_Weeks
- Product_Type
This is used by the tile detail drawer in both Employee and Guest views.

8. Environment Variables (Demo Setup)
Create a .env.local file in the Next.js project root with:
- CABOODLE_CONFIGS_API
- CABOODLE_TILES_API
- CABOODLE_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL
- AUTH_URL
- AUTH_SECRET

AUTH_SECRET should be generated locally (example: openssl rand -base64 32).

