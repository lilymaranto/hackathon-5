import type { TileRecord } from "@/lib/types";

const PLAN_GANTT_MS_PREFIX = "gantt_ms_";
const PLAN_GANTT_MS_BLANK_PREFIX = "gantt_ms_blank_";

function isPlanGanttMilestoneTileId(tileId: string): boolean {
  return tileId.startsWith(PLAN_GANTT_MS_PREFIX);
}

function planGanttMilestoneSourceTileIdFromTileId(tileId: string): string | undefined {
  if (tileId.startsWith(PLAN_GANTT_MS_BLANK_PREFIX)) return undefined;
  if (tileId.startsWith(PLAN_GANTT_MS_PREFIX)) return tileId.slice(PLAN_GANTT_MS_PREFIX.length);
  return undefined;
}

/** True when the title already ends with the word Complete or Live. */
export function milestoneTitleEndsWithCompleteOrLive(title: string): boolean {
  return /\b(complete|live)\s*$/i.test(title.trim());
}

/**
 * Ensures milestone labels end with "Complete" or "Live" (word boundary at end).
 * Go-live / journey-style names prefer "Live"; everything else gets "Complete".
 */
export function normalizeMilestoneTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "Complete";
  if (milestoneTitleEndsWithCompleteOrLive(trimmed)) return trimmed;

  if (/\bgo-?live\b/i.test(trimmed) || /\bjourneys?\b/i.test(trimmed) || /\bmessage build\b/i.test(trimmed)) {
    return `${trimmed} Live`;
  }
  return `${trimmed} Complete`;
}

export function milestoneTileDisplayTitle(
  tile: Pick<TileRecord, "Title" | "Category" | "Tile_ID" | "Workstream">,
): string {
  if (tile.Category !== "milestone" && !isPlanGanttMilestoneTileId(tile.Tile_ID)) {
    return tile.Title;
  }

  if (tile.Workstream === "gantt_messaging") {
    const src = planGanttMilestoneSourceTileIdFromTileId(tile.Tile_ID);
    if (src === "journeys_live" || tile.Tile_ID.endsWith("journeys_live")) {
      return normalizeMilestoneTitle(tile.Title || "Multi Channel Journeys Live");
    }
  }

  return normalizeMilestoneTitle(tile.Title);
}
