/**
 * Vertical scale for swimlane + Gantt layout (tile / row / chevron heights in px).
 * Typography stays unchanged unless you edit `text-*` classes separately.
 */
export const CANVAS_LAYOUT_Y_SCALE = 0.65;

export function scaleYpx(value: number): number {
  return Math.max(1, Math.round(value * CANVAS_LAYOUT_Y_SCALE));
}

/** Braze Core swimlane bar height (keep in sync with Tailwind `h-7` on tiles). */
export const BRAZE_CORE_TILE_HEIGHT_PX = scaleYpx(40);

/** Shared Gantt bar geometry (Braze Core + AI Decisioning). */
export const GANTT_TASK_BAR_HEIGHT_PX = scaleYpx(32);
export const GANTT_TASK_BAR_LANE_GAP_PX = scaleYpx(4);
export const GANTT_ROW_TOP_PAD_PX = scaleYpx(4);

/**
 * Braze Core Gantt only: first row when a workstream is expanded — left rail shows workstream name +
 * collapse chevron + divider above activity titles. Add this to row `minHeight` and to every bar’s
 * `top` offset so tiles line up with the activity text instead of floating at the top of the row.
 */
export const BRAZE_CORE_GANTT_EXPANDED_FIRST_ROW_CHROME_PX = scaleYpx(52);
