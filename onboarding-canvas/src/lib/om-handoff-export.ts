import { AI_DECISIONING_STUDIO_TIMELINE_WEEKS, WORKSTREAMS } from "@/lib/constants";
import { getTileTimelineUnits } from "@/lib/timeline-units";
import type { ConfigRecord, PlanOptionId, TileRecord, Workstream } from "@/lib/types";

function workstreamLabel(ws: Workstream): string {
  return WORKSTREAMS.find((w) => w.id === ws)?.label ?? ws;
}

/** Human-readable placement for hand-off doc (plan-specific units / weeks). */
export function approximateTimelineLabel(
  config: Pick<ConfigRecord, "planOptionId" | "Duration_Weeks" | "Product_Type">,
  tile: TileRecord,
): string {
  const durationWeeks =
    config.Product_Type === "AI Decisioning Studio"
      ? AI_DECISIONING_STUDIO_TIMELINE_WEEKS
      : config.Duration_Weeks;
  const planId: PlanOptionId =
    config.Product_Type === "AI Decisioning Studio"
      ? "ai_decisioning_studio"
      : config.planOptionId;
  const { startUnit, endUnit } = getTileTimelineUnits(planId, tile, durationWeeks);
  const span = endUnit - startUnit + 1;

  if (planId === "growth_silver") {
    const week = Math.ceil(startUnit / 8);
    const sub = ((startUnit - 1) % 8) + 1;
    return `Plan week ${week} (column ${startUnit} of ${durationWeeks * 8}), span ${span} columns`;
  }
  if (planId === "ai_decisioning_studio") {
    return `Weeks ${startUnit}–${endUnit} (W${startUnit}–W${endUnit})`;
  }
  if (
    planId === "12_week" ||
    planId === "ignite_silver" ||
    planId === "quickstart_gold" ||
    planId === "quickstart_silver"
  ) {
    return `Timeline columns ${startUnit}–${endUnit} (span ${span}) — see swimlane month bands for calendar mapping`;
  }
  if (planId === "ignite_gold") {
    return `Weeks ${startUnit}–${endUnit} (span ${span} weeks on Ignite Gold grid)`;
  }
  return `Start column ${startUnit}, span ${span}`;
}

export function isCustomOmTile(tile: TileRecord): boolean {
  return tile.Tile_ID.startsWith("custom_");
}

function hasText(s: string | undefined): boolean {
  return (s ?? "").trim().length > 0;
}

export function shouldExportOmTile(tile: TileRecord): boolean {
  if (isCustomOmTile(tile)) return true;
  if (hasText(tile.Notes)) return true;
  if (hasText(tile.Description)) return true;
  return false;
}

export function sortTilesForOmExport(tiles: TileRecord[]): TileRecord[] {
  return [...tiles].sort((a, b) => a.Start_Week - b.Start_Week || a.Stack_Order - b.Stack_Order);
}

export type OmExportSection =
  | { kind: "heading"; text: string }
  | { kind: "body"; text: string };

export function buildOmExportSections(config: ConfigRecord, tile: TileRecord): OmExportSection[] {
  const sections: OmExportSection[] = [];
  const timeline = approximateTimelineLabel(config, tile);
  const titleLine = `--- ${timeline} — ${tile.Title} ---`;
  sections.push({ kind: "heading", text: titleLine });
  sections.push({ kind: "body", text: `Workstream: ${workstreamLabel(tile.Workstream)}` });

  const custom = isCustomOmTile(tile);
  const desc = (tile.Description ?? "").trim();
  const notes = (tile.Notes ?? "").trim();

  if (custom) {
    if (desc) {
      sections.push({ kind: "body", text: "" });
      sections.push({ kind: "body", text: "Description:" });
      sections.push({ kind: "body", text: desc });
    }
    if (notes) {
      sections.push({ kind: "body", text: "" });
      sections.push({ kind: "body", text: "Notes:" });
      sections.push({ kind: "body", text: notes });
    }
    if (hasText(tile.Attendees)) {
      sections.push({ kind: "body", text: "" });
      sections.push({ kind: "body", text: "Suggested attendees / stakeholders:" });
      sections.push({ kind: "body", text: (tile.Attendees ?? "").trim() });
    }
    if (hasText(tile.Resources)) {
      sections.push({ kind: "body", text: "" });
      sections.push({ kind: "body", text: "Resources:" });
      sections.push({ kind: "body", text: (tile.Resources ?? "").trim() });
    }
    if (hasText(tile.Desired_Outcomes)) {
      sections.push({ kind: "body", text: "" });
      sections.push({ kind: "body", text: "Desired outcomes:" });
      sections.push({ kind: "body", text: (tile.Desired_Outcomes ?? "").trim() });
    }
    sections.push({ kind: "body", text: "" });
    sections.push({ kind: "body", text: `Tile ID: ${tile.Tile_ID} · Category: ${tile.Category}` });
    return sections;
  }

  if (desc) {
    sections.push({ kind: "body", text: "" });
    sections.push({ kind: "body", text: "Description:" });
    sections.push({ kind: "body", text: desc });
  }
  if (notes) {
    sections.push({ kind: "body", text: "" });
    sections.push({ kind: "body", text: "Notes:" });
    sections.push({ kind: "body", text: notes });
  }
  return sections;
}
