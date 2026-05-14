import type { PlanOptionId } from "@/lib/types";

/** DOM id prefix for scroll targets (`${BRAZE_RESOURCE_ROW_ID_PREFIX}${row.id}`). */
export const BRAZE_RESOURCE_ROW_ID_PREFIX = "braze-res-";

/** Scroll target for the whole Roles & Responsibilities / Recommended Resources block (see `BrazeCoreResourcesChart`). */
export const BRAZE_RESOURCES_CHART_SECTION_ID = "braze-core-resources-chart";

export type GrowthSilverResourceRow = {
  id: string;
  linkLabel: string;
  team: string;
  role: string;
  responsibilities: string[];
  deliveryRisk: string[];
  discovery: string;
  planning: string;
  execution: string;
  omitUnlessEmail?: boolean;
};

export type StandardBrazeResourceRow = {
  id: string;
  linkLabel: string;
  profileLines: string[];
  responsibilities: string[];
  deliveryRisk: string[];
  discovery: string;
  planning: string;
  execution: string;
  omitUnlessEmail?: boolean;
};

export const GROWTH_SILVER_RESOURCE_ROWS: GrowthSilverResourceRow[] = [
  {
    id: "gs-project-lead",
    linkLabel: "Project Lead",
    team: "Project",
    role: "Project Lead",
    responsibilities: [
      "Coordinate & project manage internal and third party (agency) resources, and act as main point of contact and source of truth for Braze’s onboarding team",
      "Organize internal resources for necessary meeting scheduling and attendance",
    ],
    deliveryRisk: ["Slowed progress due to no coordination amongst your team(s)"],
    discovery: "1 - 2",
    planning: "1 - 2",
    execution: "1 - 2",
  },
  {
    id: "gs-marketing-lead",
    linkLabel: "Marketing Lead",
    team: "Marketing",
    role: "Lead",
    responsibilities: [
      "Define marketing requirements (use cases and required campaigns + channels + prioritization of those) for launch",
      "Participate in Braze onboarding marketing sessions and read our User Guide documentation",
      "Understand Braze functionality as it relates to your marketing scope",
    ],
    deliveryRisk: ["No marketing scope is defined and agreed"],
    discovery: "1 - 2",
    planning: "1 - 2",
    execution: "2 - 3",
  },
  {
    id: "gs-marketing-end-users",
    linkLabel: "Marketing End Users",
    team: "Marketing",
    role: "End Users",
    responsibilities: [
      "Participate in all onboarding marketing workshops and engage with the Braze User Guide documentation",
      "Complete / attend Braze training sessions",
      "Build and execute on use cases within the Braze platform",
      "Understand the Braze data structure to support execution of use cases within the Braze platform (i.e. Segments - Braze’s audience builder)",
    ],
    deliveryRisk: ["No ability to launch campaigns achieving your scope"],
    discovery: "0.5",
    planning: "1",
    execution: "1 - 5",
  },
  {
    id: "gs-technical-lead",
    linkLabel: "Technical Lead",
    team: "Technical",
    role: "Lead",
    responsibilities: [
      "Participate in Braze onboarding technical sessions and read technical documentation",
      "Define integration requirements and oversee the required SDK and API integrations including QA.",
      "Main point of contact for integration progress updates and communication of any Braze support required.",
      "Identify the data sources and flow required to enable completion of the marketing use cases",
    ],
    deliveryRisk: [
      "Integration delays if a solution is not agreed upon and a path to integrate is unclear",
      "Unclear on where required data should flow from",
    ],
    discovery: "0.5",
    planning: "0.5 - 1",
    execution: "1",
  },
  {
    id: "gs-fe-be-dev",
    linkLabel: "Front/Back-end Developer",
    team: "Technical",
    role: "Front/Back-end Dev",
    responsibilities: [
      "Participate in onboarding technical workshops",
      "Read and follow the Braze Developer Guide documentation",
      "Data integrations including SDKs, APIs and any third-party vendors",
    ],
    deliveryRisk: ["No data available for use by the marketing team"],
    discovery: "0.5",
    planning: "1",
    execution: "2 - 3",
  },
  {
    id: "gs-dns-ssl",
    linkLabel: "DNS / SSL",
    team: "Technical",
    role: "DNS/SSL",
    responsibilities: [
      "Responsible for owning or identifying the owner of DNS record implementation and SSL setup. Read more about Email Setup",
    ],
    deliveryRisk: [
      "Without SSL setup, links shared with customers are not secure",
      "Delay in commencing IP Warming (launching email)",
    ],
    discovery: "0.5",
    planning: "0",
    execution: "0",
    omitUnlessEmail: true,
  },
];

export const STANDARD_BRAZE_RESOURCE_ROWS: StandardBrazeResourceRow[] = [
  {
    id: "st-project-sponsor",
    linkLabel: "Project Sponsor",
    profileLines: ["Project Sponsor"],
    responsibilities: [
      "Participate in the Braze onboarding kick-off session",
      "Accountable for successful delivery of the Braze project and will act as an escalation point throughout the engagement",
    ],
    deliveryRisk: ["No escalation path"],
    discovery: "0 - 0.5",
    planning: "0 - 0.5",
    execution: "0 - 0.5",
  },
  {
    id: "st-core-project-lead",
    linkLabel: "Core Project Lead",
    profileLines: ["Core Project Lead"],
    responsibilities: [
      "Participate in all Braze onboarding sessions and ongoing PM alignment calls",
      "Coordinate & project manage internal and third party (agency) resources and act as main point of contact and source of truth for Braze’s onboarding team",
      "Drive definition of scope and ensure alignment and focus on this throughout the onboarding process",
      "Manage risks and issues within client organisation across all teams involved",
      "Organise internal resources for necessary meeting scheduling and attendance",
    ],
    deliveryRisk: [
      "Slowed progress due to delays in definition of scope",
      "Inefficient use of Braze onboarding sessions & onboarding support",
    ],
    discovery: "1-2",
    planning: "1-2",
    execution: "1-2",
  },
  {
    id: "st-marketing-lead",
    linkLabel: "Marketing Lead",
    profileLines: ["Marketing Lead"],
    responsibilities: [
      "Participate in Braze onboarding marketing sessions and read our User Guide documentation",
      "Define marketing requirements (use cases and required campaigns + channels + prioritisation of those).",
      "Understand Braze data structure to support campaign & data planning exercise",
      "Understand Braze functionality as it relates to your marketing scope",
    ],
    deliveryRisk: ["No marketing scope is defined and agreed"],
    discovery: "1-2",
    planning: "1-2",
    execution: "1",
  },
  {
    id: "st-engineering-leads",
    linkLabel: "Engineering Lead(s)",
    profileLines: ["Engineering Lead(s)", "(Front and/or Back-end Lead)"],
    responsibilities: [
      "Participate in Braze onboarding technical sessions and read our technical documentation",
      "Define integration requirements and oversee the required SDK and API integrations including QA.",
      "Main point of contact for integration progress updates and communication of any Braze support required.",
      "Identifying the data sources and flow required to enable completion of the marketing use cases",
    ],
    deliveryRisk: [
      "Integration delays if a solution is not agreed and a path towards integration is unclear",
      "No point of contact for tech alignment, clarifications or escalations",
      "Unclear data requirements",
    ],
    discovery: "1-1.5",
    planning: "1-1.5",
    execution: "1-1.5",
  },
  {
    id: "st-data-reporting-lead",
    linkLabel: "Data & Reporting Lead",
    profileLines: ["Data & Reporting Lead"],
    responsibilities: [
      "Participate in Braze onboarding technical or reporting (if included) sessions and read our reporting documentation",
      "Define reporting requirements for onboarding",
      "Point of contract for data & marketing reporting requirements & builds",
    ],
    deliveryRisk: ["No clear reporting scope defined"],
    discovery: "0.5",
    planning: "0.5",
    execution: "1",
  },
  {
    id: "st-marketing-end-user",
    linkLabel: "Marketing End User",
    profileLines: ["Marketing End User", "Segment Building", "Campaign / Canvas Building"],
    responsibilities: [
      "Participate in all onboarding marketing workshops and engage with the Braze User Guide documentation",
      "Attend onboarding enablement sessions and watch our learning at Braze (LAB) online video training courses",
      "Build and execute on use cases within the Braze platform",
      "Understand the Braze data structure to support execution of use cases within the Braze platform",
    ],
    deliveryRisk: ["No ability to launch campaigns and journeys"],
    discovery: "0.5-1",
    planning: "0.5-1",
    execution: "2-4",
  },
  {
    id: "st-content-creator",
    linkLabel: "Content Creator / Technical marketing User",
    profileLines: [
      "Content Creator / Technical marketing User",
      "UX Design",
      "Personalisation using Liquid",
      "Conditional Logic",
    ],
    responsibilities: [
      "Support marketing team and end users with manipulating data access via Connected Content and/or writing Liquid scripts for conditional blocks",
    ],
    deliveryRisk: [
      "May be hindered in producing email templates that are fit for purpose",
      "Slower adoption of Brazes personalisation features",
    ],
    discovery: "0 - 0.5",
    planning: "0 - 0.5",
    execution: "1-2",
  },
  {
    id: "st-front-end-dev",
    linkLabel: "Front End Developer",
    profileLines: ["Front End Developer", "iOS / Android / JavaScript", "QA"],
    responsibilities: [
      "Participate in onboarding technical workshops",
      "Reading and following the Braze Developer Guide documentation",
      "Integrating the Braze SDKs required for scope (i.e. iOS, Android, Web, or other SDKs)",
    ],
    deliveryRisk: [
      "The Push, IAM and Content Card channels can’t be launched due to no SDK integration",
      "No data collection via the SDK",
    ],
    discovery: "0.5-1",
    planning: "0.5-1",
    execution: "2-3",
  },
  {
    id: "st-back-end-dev",
    linkLabel: "Back End Developer",
    profileLines: ["Back End Developer", "JSON", "QA"],
    responsibilities: [
      "Participate in onboarding technical workshops",
      "Reading and following the Braze Developer Guide documentation",
      "Setup API imports & exports",
      "Setup API triggered messaging",
    ],
    deliveryRisk: ["No data available from the API endpoints", "No API Triggered messaging"],
    discovery: "0.5-1",
    planning: "0.5-1",
    execution: "2-3",
  },
  {
    id: "st-it-manager",
    linkLabel: "IT Manager",
    profileLines: ["IT Manager", "DNS & SSL"],
    responsibilities: [
      "Responsible for owning or identifying the owner of DNS record implementation and SSL setup. Read more about Email Setup",
    ],
    deliveryRisk: [
      "Inability to send emails through Braze",
      "Without SSL, email links are not secure",
    ],
    discovery: "0",
    planning: "0",
    execution: "0.5",
    omitUnlessEmail: true,
  },
];

export function filterGrowthSilverRows(
  rows: GrowthSilverResourceRow[],
  emailEnabled: boolean,
): GrowthSilverResourceRow[] {
  return rows.filter((r) => !r.omitUnlessEmail || emailEnabled);
}

export function filterStandardBrazeRows(
  rows: StandardBrazeResourceRow[],
  emailEnabled: boolean,
): StandardBrazeResourceRow[] {
  return rows.filter((r) => !r.omitUnlessEmail || emailEnabled);
}

export function brazeResourceRowDomId(rowId: string): string {
  return `${BRAZE_RESOURCE_ROW_ID_PREFIX}${rowId}`;
}

function normalizeAttendeeMatchLine(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function maxLabelLength(row: { labels: string[] }): number {
  return row.labels.reduce((m, l) => Math.max(m, l.length), 0);
}

/** Split a bullet into parts that might contain an embedded role label (e.g. "Alex — Marketing Lead"). */
function attendeeMatchSegments(line: string): string[] {
  const t = line.trim();
  if (!t) return [];
  const pieces = t
    .split(/\s*(?:\r?\n|[,;|]|(?:\s+-\s+)|(?:\s+–\s+)|(?:\s+—\s+))\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const raw = pieces.includes(t) ? pieces : [...pieces, t];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of [...raw].sort((a, b) => b.length - a.length)) {
    const k = normalizeAttendeeMatchLine(p);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function matchNormalizedLineToDomId(
  n: string,
  sorted: { id: string; labels: string[] }[],
): string | undefined {
  for (const r of sorted) {
    for (const lab of r.labels) {
      const ln = normalizeAttendeeMatchLine(lab);
      if (!ln) continue;
      if (n === ln) return brazeResourceRowDomId(r.id);
    }
  }
  const MIN_SUBSTRING = 4;
  for (const r of sorted) {
    for (const lab of r.labels) {
      const ln = normalizeAttendeeMatchLine(lab);
      if (!ln || ln.length < MIN_SUBSTRING) continue;
      if (n.includes(ln)) return brazeResourceRowDomId(r.id);
    }
  }
  return undefined;
}

/**
 * Map a suggested-attendee bullet to a resources-chart row DOM id when the text equals or contains
 * a known role label (including after commas / dashes, e.g. "Jane Doe — Marketing Lead").
 */
export function brazeResourceRowDomIdForAttendeeLine(
  line: string,
  planOptionId: PlanOptionId,
  emailEnabled: boolean,
): string | undefined {
  const rows =
    planOptionId === "growth_silver"
      ? filterGrowthSilverRows(GROWTH_SILVER_RESOURCE_ROWS, emailEnabled).map((r) => ({
          id: r.id,
          labels: [r.linkLabel],
        }))
      : filterStandardBrazeRows(STANDARD_BRAZE_RESOURCE_ROWS, emailEnabled).map((r) => ({
          id: r.id,
          labels: [r.linkLabel, ...r.profileLines],
        }));

  const sorted = [...rows].sort((a, b) => maxLabelLength(b) - maxLabelLength(a));

  for (const seg of attendeeMatchSegments(line)) {
    const n = normalizeAttendeeMatchLine(seg);
    if (!n) continue;
    const hit = matchNormalizedLineToDomId(n, sorted);
    if (hit) return hit;
  }
  return undefined;
}
