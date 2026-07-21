"use client";

import { BrazeCoreSpanResizeHandle } from "@/components/BrazeCoreSpanResizeHandle";
import { TimelineAnnotationsShell } from "@/components/TimelineAnnotationsShell";
import {
  BRAZE_CORE_GANTT_EXPANDED_FIRST_ROW_CHROME_PX,
  GANTT_ROW_TOP_PAD_PX,
  GANTT_TASK_BAR_HEIGHT_PX,
  GANTT_TASK_BAR_LANE_GAP_PX,
  scaleYpx,
} from "@/lib/canvas-layout-y";
import { EditableTimelinePeriodLabel } from "@/components/EditableTimelinePeriodLabel";
import { GROWTH_SILVER_COLUMNS_PER_WEEK, WORKSTREAMS } from "@/lib/constants";
import { getTileTimelineUnits } from "@/lib/timeline-units";
import type { TimelineAnnotationDocument } from "@/lib/timeline-annotations";
import { timelineColumnFromClientX } from "@/lib/timeline-annotations";
import type { TimelineConfig } from "@/lib/templates";
import {
  darkerOfTwoHexes,
  milestoneAccentHexFromConfig,
  parseHexColorOptional,
  resolveTileCategoryColorsFromConfig,
  textColorOnTileBackground,
  PARTNER_LED_WHITE_OUTLINE_WIDTH_PX,
  type ResolvedTileCategoryColors,
} from "@/lib/tile-category-colors";
import {
  labelHexForWorkstreamTextType,
  resolveWorkstreamLabelTextType,
  BRAZE_WS_SORT_PREFIX,
} from "@/lib/braze-workstream-order";
import {
  platinumGanttTaskLayoutEditable,
  weekMarksForPlatinumGanttTile,
} from "@/lib/enterprise-platinum-gantt-week-marks";
import { parseCustomerActivityLed } from "@/lib/customer-activity-led";
import type { ConfigRecord, PlanOptionId, TileRecord, Workstream, WorkstreamLabelTextType } from "@/lib/types";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import type { CSSProperties, HTMLAttributes, MutableRefObject, ReactNode, Ref } from "react";
import { Fragment, useCallback, useMemo, useRef, useState } from "react";

const GANTT_GUIDE_COLOR = "rgba(232, 229, 248, 0.95)";

const SINGLE_CLICK_DELAY_MS = 220;

function scheduleDeferredSingleClick(
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
  fn: () => void,
) {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {
    timerRef.current = undefined;
    fn();
  }, SINGLE_CLICK_DELAY_MS);
}

function cancelDeferredSingleClick(
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }
}

const ADS_GANTT_LEGEND_SWATCH_H_PX = scaleYpx(32);
const ADS_GANTT_LEGEND_SWATCH_W_PX = scaleYpx(64);

type GuideLineKind = "thin" | "thick";

function pctFromColumn(col: number, timelineColumns: number): number {
  return (col / timelineColumns) * 100;
}

/**
 * Visual-only vertical guides for Gantt rails. Does not affect tile layout.
 * — Growth Silver: one line per week (sub-columns are not lined).
 * — Month-based plans: thick line at each month start, three thin lines at ¼ / ½ / ¾ of each month band.
 * — Fallback: thin line every timeline column.
 */
function buildGanttTimelineColumnGuidesStyle(params: {
  planOptionId: PlanOptionId;
  timelineColumns: number;
  durationWeeks: number;
  showMonthsRow: boolean;
  monthGridSpans: number[];
}): CSSProperties {
  const { planOptionId, timelineColumns, durationWeeks, showMonthsRow, monthGridSpans } = params;
  if (timelineColumns <= 0) return {};

  const byPct = new Map<number, GuideLineKind>();
  const lineAt = (p: number, kind: GuideLineKind): void => {
    const key = Math.round(p * 1e6) / 1e6;
    const prev = byPct.get(key);
    if (!prev || (prev === "thin" && kind === "thick")) byPct.set(key, kind);
  };

  if (planOptionId === "growth_silver") {
    const cpw = GROWTH_SILVER_COLUMNS_PER_WEEK;
    for (let w = 1; w < durationWeeks; w += 1) {
      lineAt(pctFromColumn(w * cpw, timelineColumns), "thin");
    }
  } else if (showMonthsRow && monthGridSpans.length > 0) {
    let startCol = 0;
    for (let i = 0; i < monthGridSpans.length; i += 1) {
      const span = monthGridSpans[i]!;
      lineAt(pctFromColumn(startCol, timelineColumns), "thick");
      for (const frac of [0.25, 0.5, 0.75] as const) {
        lineAt(pctFromColumn(startCol + span * frac, timelineColumns), "thin");
      }
      startCol += span;
    }
  } else {
    const stepPct = 100 / timelineColumns;
    return {
      backgroundImage: `repeating-linear-gradient(
      to right,
      transparent 0,
      transparent calc(${stepPct}% - 0.5px),
      ${GANTT_GUIDE_COLOR} calc(${stepPct}% - 0.5px),
      ${GANTT_GUIDE_COLOR} ${stepPct}%
    )`,
    };
  }

  const sorted = [...byPct.entries()].sort((a, b) => a[0] - b[0]);
  const stops: string[] = ["transparent 0"];
  for (const [p, kind] of sorted) {
    const halfPx = kind === "thick" ? 1 : 0.5;
    stops.push(
      `transparent calc(${p}% - ${halfPx}px)`,
      `${GANTT_GUIDE_COLOR} calc(${p}% - ${halfPx}px)`,
      `${GANTT_GUIDE_COLOR} calc(${p}% + ${halfPx}px)`,
      `transparent calc(${p}% + ${halfPx}px)`,
    );
  }
  stops.push("transparent 100%");
  return { backgroundImage: `linear-gradient(to right, ${stops.join(", ")})` };
}

export type BrazeCoreGanttSpanResizeProps = {
  planOptionId: PlanOptionId;
  durationWeeks: number;
  timelineColumns: number;
  getTimelineWidthPx: () => number;
  templateSpanWeeksForTile: (tile: TileRecord) => number;
  minSpanWeeksForTile?: (tile: TileRecord) => number | undefined;
  maxSpanWeeksForTile?: (tile: TileRecord) => number | undefined;
  /** When set, pointer resize steps use this column count (e.g. 28 plan weeks on a 48-col rail). */
  spanResizeDragColumns?: number;
  onSpanChange: (tile: TileRecord, span: number) => void;
  /** When `"aiAdsChevron"`, uses {@link clampAdsChevronSpanWeeks} (AI Decisioning Gantt bars). */
  spanResizeMode?: "braze" | "aiAdsChevron";
  /** Override handle hit height in px (e.g. match Gantt bar height). */
  spanResizeHandleHeightPx?: number;
};

export type BrazeCoreGanttChartProps = {
  tiles: TileRecord[];
  showOnboardingSessions: boolean;
  planOptionId: PlanOptionId;
  durationWeeks: number;
  timelineColumns: number;
  timelineConfig: TimelineConfig;
  showMonthsRow: boolean;
  showWeeksRow: boolean;
  phaseGridSpans: number[];
  monthGridSpans: number[];
  onOpenTile: (tile: TileRecord) => void;
  /** When false, tiles use the same DnD ids as swimlane (`row:{workstream}` + stable tile key). */
  readOnly?: boolean;
  /** Attach to the timeline column header grid so parent can measure rail width for drag math. */
  timelineRailRef?: Ref<HTMLDivElement | null>;
  /** When set with `readOnly={false}`, shows an east-edge resize handle on each bar. */
  spanResize?: BrazeCoreGanttSpanResizeProps;
  /**
   * When set, rows are grouped by these lane ids (milestone merge is per-lane only).
   * Use with {@link matchAiDecisioningSwimlaneBars} for AI Decisioning Studio.
   */
  laneLegend?: ReadonlyArray<{ id: Workstream; label: string; color: string }>;
  /** Second legend row (Braze Core Gantt): heading above workstream color swatches. Default `Workstreams`. */
  laneLegendTitle?: string;
  /** AI Decisioning: Gantt bars + key match swimlane (lavender activities, violet milestones). */
  matchAiDecisioningSwimlaneBars?: boolean;
  /**
   * Config-driven onboarding / customer fills. Used for AI Decisioning Gantt bars and key when
   * {@link matchAiDecisioningSwimlaneBars} is true; also for Braze Core Gantt **category** legend swatches
   * (bars stay channel-colored). Omit to use defaults.
   */
  aiDecisioningCategoryColors?: Pick<
    ConfigRecord,
    "onboardingSessionTileColor" | "customerActivityTileColor"
  >;
  /** Braze Core: per-workstream rail / bar hue overrides (e.g. config gradient). Ignored when {@link laneLegend} is set. */
  workstreamLaneColorOverrides?: ReadonlyMap<Workstream, string>;
  /**
   * Legend copy: replaces “Customer” in activity / combo key labels (use config `Title` / prospect name).
   * Falls back to “Prospect” when empty.
   */
  legendProspectLabel?: string;
  /** When true, Braze Core Gantt shows partner-led key + outline bars (Hands On Keyboard Support). */
  handsOnKeyboardSupport?: boolean;
  /** Partner name for Gantt key label; falls back to “Partner”. */
  legendPartnerLabel?: string;
  /** Braze Core: saved label contrast per workstream (`b` / `w`); collapsed + expanded left rails. */
  /** User-saved label contrast (Mongo); omit for auto white (default brand) or rail luminance (custom). */
  explicitWorkstreamLabelTypes?: ReadonlyMap<Workstream, WorkstreamLabelTextType>;
  /** Braze Core: double-click workstream title in collapsed row to flip `b`/`w` and persist (parent PATCH). */
  onWorkstreamLabelTextDoubleClick?: (workstream: Workstream) => void;
  /** Double-click timeline header rail: column index 1…timelineColumns (new marker). */
  onAppendTimelineAnnotationAtColumn?: (column: number) => void;
  timelineAnnotation?: TimelineAnnotationDocument;
  onTimelineAnnotationChange?: (doc: TimelineAnnotationDocument) => void;
  /** After a marker title commit (Enter / blur / click-away); parent may flush PATCH immediately. */
  onAfterAnnotationTitleCommit?: () => void;
  /** Caboodle **Timeline_Dates** — replaces month/week header labels when set. */
  timelineDates?: string[];
  timelinePeriodDatesEditable?: boolean;
  onTimelineDateCommit?: (index: number, isoDate: string) => void;
  /**
   * Enterprise Platinum: one Gantt row per plan task, grouped by {@link laneLegend} section lanes.
   */
  enterprisePlanTaskGantt?: boolean;
  /** Default Braze rail palette (no custom gradient) → white section labels unless saved in Mongo. */
  useDefaultBrandWorkstreamColors?: boolean;
  /** Enterprise Platinum: drag-reorder section blocks (not individual task rows). */
  sectionSortEnabled?: boolean;
};

/** Must match {@link CanvasBoard} `tileStableKey` for shared DnD ids. */
function tileStableKey(tile: TileRecord): string {
  return tile.CaboodlePatchKey ?? `${tile.Config_ID}__${tile.Tile_ID}`;
}

/** AI Gantt: omit this milestone from the chart (still on swimlane / server data). */
const ADS_GANTT_OMIT_TILE_IDS = new Set(["ads_ms_kickoff"]);
const WEEKLY_ALIGNMENT_TILE_ID = "weekly_alignment";
/** Campaign: optional phase 2 is always its own row (after phase 1 + milestone block). */
const CAMPAIGN_PHASE_2_TILE_IDS = new Set(["launch_phase_2", "phase_2_optional"]);

const DEFAULT_BRAZE_GANTT_LANE_ORDER: readonly Workstream[] = WORKSTREAMS.map((w) => w.id);

function tileKey(tile: TileRecord): string {
  return tile.CaboodlePatchKey ?? `${tile.Config_ID}__${tile.Tile_ID}`;
}

function brazeWorkstreamColor(workstreamId: Workstream): string {
  return WORKSTREAMS.find((w) => w.id === workstreamId)?.color ?? "#300266";
}

function resolveWorkstreamColor(
  workstreamId: Workstream,
  laneLegend: ReadonlyArray<{ id: Workstream; label: string; color: string }> | undefined,
  laneColorOverrides: ReadonlyMap<Workstream, string> | undefined,
): string {
  const fromLegend = laneLegend?.find((l) => l.id === workstreamId)?.color;
  if (fromLegend) return fromLegend;
  const fromOverrides = laneColorOverrides?.get(workstreamId);
  if (fromOverrides) return fromOverrides;
  return brazeWorkstreamColor(workstreamId);
}

type GanttSectionSortRailProps = Pick<
  HTMLAttributes<HTMLDivElement>,
  "onPointerDown" | "onKeyDown" | "role" | "tabIndex" | "aria-disabled" | "aria-pressed" | "aria-roledescription"
>;

function GanttPlatinumSectionSortable({
  sectionWs,
  sortEnabled,
  children,
}: {
  sectionWs: Workstream;
  sortEnabled: boolean;
  children: (railProps: GanttSectionSortRailProps | undefined) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${BRAZE_WS_SORT_PREFIX}${sectionWs}`,
    disabled: !sortEnabled,
  });
  const sortStyle: CSSProperties = {};
  if (sortEnabled) {
    sortStyle.transform = CSS.Transform.toString(transform);
    sortStyle.transition = transition;
    if (isDragging) {
      sortStyle.zIndex = 3;
      sortStyle.boxShadow = "0 8px 28px rgba(45, 35, 84, 0.18)";
    }
  }
  const railProps: GanttSectionSortRailProps | undefined = sortEnabled
    ? { ...attributes, ...listeners }
    : undefined;
  return (
    <div ref={setNodeRef} style={sortStyle}>
      {children(railProps)}
    </div>
  );
}

function sortTilesForWorkstream(a: TileRecord, b: TileRecord): number {
  if (a.Start_Week !== b.Start_Week) return a.Start_Week - b.Start_Week;
  if (a.Stack_Order !== b.Stack_Order) return a.Stack_Order - b.Stack_Order;
  return a.Title.localeCompare(b.Title);
}

/**
 * Group tiles into Gantt rows: milestones attach to the previous activity row (same workstream).
 * weekly_alignment is always its own top row and never receives merged milestones.
 * Campaign Launch Phase 2 (optional) is excluded from merging and rendered as its own row after the rest.
 */
function buildGanttRowsByWorkstream(
  tiles: TileRecord[],
  laneOrder: readonly Workstream[] = DEFAULT_BRAZE_GANTT_LANE_ORDER,
): TileRecord[][] {
  const byWs = new Map<Workstream, TileRecord[]>();
  for (const t of tiles) {
    const list = byWs.get(t.Workstream) ?? [];
    list.push(t);
    byWs.set(t.Workstream, list);
  }

  const out: TileRecord[][] = [];

  for (const wsId of laneOrder) {
    const ws = WORKSTREAMS.find((w) => w.id === wsId);
    if (!ws) continue;
    const wsTiles = byWs.get(ws.id);
    if (!wsTiles?.length) continue;

    const sorted = [...wsTiles].sort(sortTilesForWorkstream);

    const weeklyTiles = sorted.filter((t) => t.Tile_ID === WEEKLY_ALIGNMENT_TILE_ID);
    const phase2Tile =
      ws.id === "campaign"
        ? sorted.find((t) => CAMPAIGN_PHASE_2_TILE_IDS.has(t.Tile_ID))
        : undefined;

    const pool = sorted.filter(
      (t) =>
        t.Tile_ID !== WEEKLY_ALIGNMENT_TILE_ID &&
        !(ws.id === "campaign" && CAMPAIGN_PHASE_2_TILE_IDS.has(t.Tile_ID)),
    );

    if (weeklyTiles.length) {
      for (const wt of weeklyTiles) out.push([wt]);
    }

    for (const t of pool) {
      if (t.Category === "milestone") {
        if (out.length === 0) {
          out.push([t]);
          continue;
        }
        const lastRow = out[out.length - 1]!;
        const anchorWeeklyOnly =
          lastRow.length === 1 && lastRow[0]!.Tile_ID === WEEKLY_ALIGNMENT_TILE_ID;
        if (anchorWeeklyOnly) {
          out.push([t]);
        } else {
          lastRow.push(t);
        }
      } else {
        out.push([t]);
      }
    }

    if (phase2Tile) out.push([phase2Tile]);
  }

  return out;
}

/** Consecutive Gantt rows with the same workstream → one collapsible section (Braze Core). */
function groupBrazeGanttRowsByWorkstream(
  rows: TileRecord[][],
): { workstream: Workstream; rows: TileRecord[][] }[] {
  const out: { workstream: Workstream; rows: TileRecord[][] }[] = [];
  for (const rowTiles of rows) {
    const ws = rowTiles[0]!.Workstream;
    const tail = out[out.length - 1];
    if (tail && tail.workstream === ws) tail.rows.push(rowTiles);
    else out.push({ workstream: ws, rows: [rowTiles] });
  }
  return out;
}

/** Same milestone-merge rules as {@link buildGanttRowsByWorkstream}, but scoped per lane (no cross-lane merge). */
function buildGanttRowsByLaneOrder(
  tiles: TileRecord[],
  laneOrder: readonly Workstream[],
): TileRecord[][] {
  const byLane = new Map<Workstream, TileRecord[]>();
  for (const t of tiles) {
    const list = byLane.get(t.Workstream) ?? [];
    list.push(t);
    byLane.set(t.Workstream, list);
  }
  const out: TileRecord[][] = [];

  for (const laneId of laneOrder) {
    const laneTiles = byLane.get(laneId);
    if (!laneTiles?.length) continue;
    const sorted = [...laneTiles].sort(sortTilesForWorkstream);
    for (const t of sorted) {
      if (t.Category === "milestone") {
        if (out.length === 0) {
          out.push([t]);
          continue;
        }
        const lastRow = out[out.length - 1]!;
        const lastLane = lastRow[0]!.Workstream;
        if (lastLane === laneId && lastRow.some((x) => x.Category !== "milestone")) {
          lastRow.push(t);
        } else {
          out.push([t]);
        }
      } else {
        out.push([t]);
      }
    }
  }

  return out;
}

/** Enterprise Platinum task list: one bar per task, ordered by lane legend then stack order. */
function buildGanttRowsForPlanTaskList(
  tiles: TileRecord[],
  laneOrder?: readonly Workstream[],
): TileRecord[][] {
  const orderIndex = laneOrder?.length
    ? new Map(laneOrder.map((id, i) => [id, i]))
    : undefined;
  const sorted = [...tiles].sort((a, b) => {
    if (orderIndex) {
      const ia = orderIndex.get(a.Workstream) ?? 999;
      const ib = orderIndex.get(b.Workstream) ?? 999;
      if (ia !== ib) return ia - ib;
    }
    if (a.Stack_Order !== b.Stack_Order) return a.Stack_Order - b.Stack_Order;
    return a.Title.localeCompare(b.Title);
  });
  return sorted.map((t) => [t]);
}

const ADS_GANTT_MILESTONE_ACCENT = "#801ED7";

function assignLanesInRow(
  tiles: TileRecord[],
  planOptionId: PlanOptionId,
  durationWeeks: number,
): { tile: TileRecord; lane: number }[] {
  const units = (tile: TileRecord) => getTileTimelineUnits(planOptionId, tile, durationWeeks);
  const sorted = [...tiles].sort((a, b) => {
    const ua = units(a);
    const ub = units(b);
    if (ua.startUnit !== ub.startUnit) return ua.startUnit - ub.startUnit;
    return tileKey(a).localeCompare(tileKey(b));
  });

  const laneEnds: number[] = [];
  const result: { tile: TileRecord; lane: number }[] = [];

  for (const tile of sorted) {
    const u = units(tile);
    let lane = -1;
    for (let i = 0; i < laneEnds.length; i += 1) {
      if (u.startUnit > laneEnds[i]!) {
        lane = i;
        break;
      }
    }
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(u.endUnit);
    } else {
      laneEnds[lane] = u.endUnit;
    }
    result.push({ tile, lane });
  }

  return result;
}

/**
 * Collapsed workstream Gantt: one row whose bars are the union of all customer-activity weeks.
 * Contiguous occupied weeks merge into one segment; gaps stay empty on the same row.
 */
function buildCollapsedWorkstreamUnionSegments(
  tiles: TileRecord[],
  planOptionId: PlanOptionId,
  durationWeeks: number,
  timelineColumns: number,
): { startUnit: number; endUnit: number }[] {
  if (!tiles.length) return [];
  const occupied = new Uint8Array(timelineColumns + 1);
  for (const tile of tiles) {
    const { startUnit, endUnit } = getTileTimelineUnits(planOptionId, tile, durationWeeks);
    const from = Math.max(1, startUnit);
    const to = Math.min(timelineColumns, endUnit);
    for (let u = from; u <= to; u++) occupied[u] = 1;
  }
  const out: { startUnit: number; endUnit: number }[] = [];
  let u = 1;
  while (u <= timelineColumns) {
    while (u <= timelineColumns && !occupied[u]) u++;
    if (u > timelineColumns) break;
    const startUnit = u;
    while (u <= timelineColumns && occupied[u]) u++;
    out.push({ startUnit, endUnit: u - 1 });
  }
  return out;
}

function customerActivityTilesOverlappingUnits(
  tiles: TileRecord[],
  startUnit: number,
  endUnit: number,
  planOptionId: PlanOptionId,
  durationWeeks: number,
): TileRecord[] {
  return tiles.filter((tile) => {
    const u = getTileTimelineUnits(planOptionId, tile, durationWeeks);
    return u.startUnit <= endUnit && u.endUnit >= startUnit;
  });
}

function rowTimelineMinHeightPx(maxLane: number): number {
  const lanes = maxLane + 1;
  return (
    GANTT_ROW_TOP_PAD_PX * 2 +
    lanes * GANTT_TASK_BAR_HEIGHT_PX +
    Math.max(0, lanes - 1) * GANTT_TASK_BAR_LANE_GAP_PX
  );
}

function ganttRowRailStyle(minHeight: number, timelineGuideStyle: CSSProperties | undefined): CSSProperties {
  return {
    minHeight,
    ...(timelineGuideStyle ?? {}),
  };
}

function GanttRowTimelineRailStatic({
  minHeight,
  timelineGuideStyle,
  children,
}: {
  minHeight: number;
  timelineGuideStyle: CSSProperties | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className="relative z-10 bg-transparent"
      style={ganttRowRailStyle(minHeight, timelineGuideStyle)}
    >
      {children}
    </div>
  );
}

function isBrazePartnerLedCustomerActivity(
  tile: TileRecord,
  matchAiDecisioningSwimlaneBars: boolean,
): boolean {
  return (
    !matchAiDecisioningSwimlaneBars &&
    tile.Category === "customer_activity" &&
    parseCustomerActivityLed(tile.activityLed) === "partner"
  );
}

function GanttRowTimelineRailDroppable({
  workstream,
  minHeight,
  timelineGuideStyle,
  children,
}: {
  workstream: Workstream;
  minHeight: number;
  timelineGuideStyle: CSSProperties | undefined;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: `row:${workstream}` });
  return (
    <div
      ref={setNodeRef}
      className="relative z-10 bg-transparent"
      style={ganttRowRailStyle(minHeight, timelineGuideStyle)}
    >
      {children}
    </div>
  );
}

function planGanttTileLayoutEditable(tile: TileRecord, planOptionId: PlanOptionId): boolean {
  return platinumGanttTaskLayoutEditable(
    weekMarksForPlatinumGanttTile(tile.Tile_ID, planOptionId),
  );
}

function GanttTaskBarDraggable({
  tile,
  workstreamHue,
  matchAiDecisioningSwimlaneBars,
  adsTileCategoryColors,
  categoryMilestoneFill,
  leftPct,
  widthPct,
  topPx,
  onOpen,
  dragDisabled = false,
}: {
  tile: TileRecord;
  workstreamHue: string;
  matchAiDecisioningSwimlaneBars?: boolean;
  /** Used only when {@link matchAiDecisioningSwimlaneBars} styles ADS category bars. */
  adsTileCategoryColors: ResolvedTileCategoryColors;
  /** When set (custom onboarding/customer colors), milestone bars use this instead of lane violet / workstream hue. */
  categoryMilestoneFill?: string;
  leftPct: number;
  widthPct: number;
  topPx: number;
  onOpen: () => void;
  dragDisabled?: boolean;
}) {
  const cat = tile.Category;
  const milestoneFill =
    categoryMilestoneFill ??
    (matchAiDecisioningSwimlaneBars ? ADS_GANTT_MILESTONE_ACCENT : workstreamHue);
  const activityLaneFill = workstreamHue;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tileStableKey(tile),
    disabled: dragDisabled,
  });

  const posStyle: CSSProperties = {
    left: `${leftPct}%`,
    width: `${Math.max(widthPct, 0.4)}%`,
    minWidth: 4,
    top: topPx,
    height: GANTT_TASK_BAR_HEIGHT_PX,
    transform: CSS.Translate.toString(transform),
  };

  const barTextClass = matchAiDecisioningSwimlaneBars ? "text-[11px]" : "text-[9px]";
  const common = clsx(
    "absolute z-[30] flex items-center justify-center gap-1 overflow-hidden rounded-md px-1.5 text-center font-medium leading-tight shadow-sm",
    barTextClass,
  );
  const grabClass =
    cat !== "milestone" && !dragDisabled ? "cursor-grab active:cursor-grabbing" : "";
  const draggingClass = isDragging ? "z-[45] opacity-80" : "";

  if (cat === "onboarding_session" && matchAiDecisioningSwimlaneBars) {
    const ob = adsTileCategoryColors.onboardingBg;
    return (
      <button
        ref={setNodeRef}
        type="button"
        aria-label={tile.Title}
        title={tile.Title}
        className={clsx(common, "border-0", grabClass, draggingClass)}
        style={{
          ...posStyle,
          backgroundColor: ob,
          color: textColorOnTileBackground(ob),
        }}
        onClick={onOpen}
        {...listeners}
        {...attributes}
      />
    );
  }

  if (cat === "onboarding_session") {
    return (
      <button
        ref={setNodeRef}
        type="button"
        aria-label={tile.Title}
        className={clsx(common, "border-2 bg-white", grabClass, draggingClass)}
        style={{
          ...posStyle,
          borderColor: workstreamHue,
          color: workstreamHue,
        }}
        onClick={onOpen}
        {...listeners}
        {...attributes}
      >
        <span className="line-clamp-2 w-full">{tile.Title}</span>
      </button>
    );
  }

  if (cat === "customer_activity" && matchAiDecisioningSwimlaneBars) {
    const cb = adsTileCategoryColors.customerBg;
    return (
      <button
        ref={setNodeRef}
        type="button"
        aria-label={tile.Title}
        title={tile.Title}
        className={clsx(common, "border-0", grabClass, draggingClass)}
        style={{
          ...posStyle,
          backgroundColor: cb,
          color: textColorOnTileBackground(cb),
        }}
        onClick={onOpen}
        {...listeners}
        {...attributes}
      />
    );
  }

  const isMilestone = cat === "milestone";
  if (isMilestone) {
    const milestoneBarText = "text-[8px]";
    return (
      <button
        ref={setNodeRef}
        type="button"
        aria-label={tile.Title}
        className={clsx(
          "absolute z-[30] flex items-center justify-center gap-0.5 overflow-hidden rounded-md px-1 text-center font-semibold leading-tight shadow-sm border-2 bg-white",
          milestoneBarText,
          draggingClass,
        )}
        style={{
          ...posStyle,
          borderColor: "#ffffff",
          color: milestoneFill,
        }}
        onClick={onOpen}
        {...listeners}
        {...attributes}
      >
        <Star
          size={15}
          className="shrink-0"
          style={{ color: milestoneFill }}
          fill={milestoneFill}
          stroke={milestoneFill}
          aria-hidden
        />
        <span className="line-clamp-2 w-full" style={{ color: milestoneFill }}>
          {tile.Title}
        </span>
      </button>
    );
  }

  if (cat === "customer_activity") {
    if (isBrazePartnerLedCustomerActivity(tile, !!matchAiDecisioningSwimlaneBars)) {
      return (
        <button
          ref={setNodeRef}
          type="button"
          aria-label={tile.Title}
          title={tile.Title}
          className={clsx(common, "border-solid bg-white", grabClass, draggingClass)}
          style={{
            ...posStyle,
            borderWidth: PARTNER_LED_WHITE_OUTLINE_WIDTH_PX,
            borderColor: workstreamHue,
            color: workstreamHue,
          }}
          onClick={onOpen}
          {...listeners}
          {...attributes}
        />
      );
    }
    const fill = activityLaneFill;
    const fg = textColorOnTileBackground(fill);
    return (
      <button
        ref={setNodeRef}
        type="button"
        aria-label={tile.Title}
        title={tile.Title}
        className={clsx(common, "border-0", grabClass, draggingClass)}
        style={{
          ...posStyle,
          backgroundColor: fill,
          color: fg,
        }}
        onClick={onOpen}
        {...listeners}
        {...attributes}
      />
    );
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={tile.Title}
      className={clsx(common, "border-0", grabClass, draggingClass)}
      style={{
        ...posStyle,
        backgroundColor: activityLaneFill,
        color: textColorOnTileBackground(activityLaneFill),
      }}
      onClick={onOpen}
      {...listeners}
      {...attributes}
    >
      <span className="line-clamp-2 w-full">{tile.Title}</span>
    </button>
  );
}

/** Same visuals as {@link GanttTaskBarDraggable} without `@dnd-kit` (safe outside `DndContext`). */
function GanttTaskBarStatic({
  tile,
  workstreamHue,
  matchAiDecisioningSwimlaneBars,
  adsTileCategoryColors,
  categoryMilestoneFill,
  leftPct,
  widthPct,
  topPx,
  onOpen,
}: {
  tile: TileRecord;
  workstreamHue: string;
  matchAiDecisioningSwimlaneBars?: boolean;
  adsTileCategoryColors: ResolvedTileCategoryColors;
  categoryMilestoneFill?: string;
  leftPct: number;
  widthPct: number;
  topPx: number;
  onOpen: () => void;
}) {
  const cat = tile.Category;
  const milestoneFill =
    categoryMilestoneFill ??
    (matchAiDecisioningSwimlaneBars ? ADS_GANTT_MILESTONE_ACCENT : workstreamHue);
  const activityLaneFill = workstreamHue;
  const posStyle: CSSProperties = {
    left: `${leftPct}%`,
    width: `${Math.max(widthPct, 0.4)}%`,
    minWidth: 4,
    top: topPx,
    height: GANTT_TASK_BAR_HEIGHT_PX,
  };
  const barTextClass = matchAiDecisioningSwimlaneBars ? "text-[11px]" : "text-[9px]";
  const common = clsx(
    "absolute z-[30] flex items-center justify-center gap-1 overflow-hidden rounded-md px-1.5 text-center font-medium leading-tight shadow-sm",
    barTextClass,
  );

  if (cat === "onboarding_session" && matchAiDecisioningSwimlaneBars) {
    const ob = adsTileCategoryColors.onboardingBg;
    return (
      <button
        type="button"
        aria-label={tile.Title}
        title={tile.Title}
        className={clsx(common, "cursor-pointer border-0")}
        style={{
          ...posStyle,
          backgroundColor: ob,
          color: textColorOnTileBackground(ob),
        }}
        onClick={onOpen}
      />
    );
  }

  if (cat === "onboarding_session") {
    return (
      <button
        type="button"
        aria-label={tile.Title}
        className={clsx(common, "border-2 bg-white")}
        style={{
          ...posStyle,
          borderColor: workstreamHue,
          color: workstreamHue,
        }}
        onClick={onOpen}
      >
        <span className="line-clamp-2 w-full">{tile.Title}</span>
      </button>
    );
  }

  if (cat === "customer_activity" && matchAiDecisioningSwimlaneBars) {
    const cb = adsTileCategoryColors.customerBg;
    return (
      <button
        type="button"
        aria-label={tile.Title}
        title={tile.Title}
        className={clsx(common, "cursor-pointer border-0")}
        style={{
          ...posStyle,
          backgroundColor: cb,
          color: textColorOnTileBackground(cb),
        }}
        onClick={onOpen}
      />
    );
  }

  if (cat === "milestone") {
    const milestoneBarText = "text-[8px]";
    return (
      <button
        type="button"
        aria-label={tile.Title}
        className={clsx(
          "absolute z-[30] flex items-center justify-center gap-0.5 overflow-hidden rounded-md px-1 text-center font-semibold leading-tight shadow-sm border-2 bg-white",
          milestoneBarText,
        )}
        style={{
          ...posStyle,
          borderColor: "#ffffff",
          color: milestoneFill,
        }}
        onClick={onOpen}
      >
        <Star
          size={15}
          className="shrink-0"
          style={{ color: milestoneFill }}
          fill={milestoneFill}
          stroke={milestoneFill}
          aria-hidden
        />
        <span className="line-clamp-2 w-full" style={{ color: milestoneFill }}>
          {tile.Title}
        </span>
      </button>
    );
  }

  if (cat === "customer_activity") {
    if (isBrazePartnerLedCustomerActivity(tile, !!matchAiDecisioningSwimlaneBars)) {
      return (
        <button
          type="button"
          aria-label={tile.Title}
          title={tile.Title}
          className={clsx(common, "border-solid bg-white")}
          style={{
            ...posStyle,
            borderWidth: PARTNER_LED_WHITE_OUTLINE_WIDTH_PX,
            borderColor: workstreamHue,
            color: workstreamHue,
          }}
          onClick={onOpen}
        />
      );
    }
    const fill = activityLaneFill;
    const fg = textColorOnTileBackground(fill);
    return (
      <button
        type="button"
        aria-label={tile.Title}
        title={tile.Title}
        className={clsx(common, "cursor-pointer border-0")}
        style={{
          ...posStyle,
          backgroundColor: fill,
          color: fg,
        }}
        onClick={onOpen}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={tile.Title}
      className={clsx(common, "border-0")}
      style={{
        ...posStyle,
        backgroundColor: activityLaneFill,
        color: textColorOnTileBackground(activityLaneFill),
      }}
      onClick={onOpen}
    >
      <span className="line-clamp-2 w-full">{tile.Title}</span>
    </button>
  );
}

type BrazeCoreGanttActivityRowProps = {
  rowTiles: TileRecord[];
  laneLegend: ReadonlyArray<{ id: Workstream; label: string; color: string }> | undefined;
  workstreamLaneColorOverrides: ReadonlyMap<Workstream, string> | undefined;
  planOptionId: PlanOptionId;
  durationWeeks: number;
  timelineColumns: number;
  readOnly: boolean;
  onOpenTile: (tile: TileRecord) => void;
  matchAiDecisioningSwimlaneBars: boolean;
  adsTileCategoryColors: ResolvedTileCategoryColors;
  categoryMilestoneFill: string | undefined;
  timelineGuideStyle: CSSProperties | undefined;
  spanResize: BrazeCoreGanttSpanResizeProps | undefined;
  /** Prepended above activity title buttons (e.g. non–Braze-Core expand chrome). */
  leftRailExtra?: ReactNode;
  /**
   * Braze Core only: first row of an expanded workstream — workstream label left of collapse chevron,
   * divider, then activity titles; timeline bars offset to align with titles.
   */
  brazeExpandedFirstRowChrome?: {
    label: string;
    onCollapse: () => void;
    onLabelDoubleClick?: () => void;
    sectionSortEnabled?: boolean;
    sectionSortRailProps?: GanttSectionSortRailProps;
  };
  /** Expanded Braze section: activity titles are visually subordinate to the section header. */
  ganttExpandedSectionActivityRow?: boolean;
  /** User-saved label contrast (Mongo); omit for auto white (default brand) or rail luminance (custom). */
  explicitWorkstreamLabelTypes?: ReadonlyMap<Workstream, WorkstreamLabelTextType>;
  useDefaultBrandWorkstreamColors?: boolean;
  enterprisePlanTaskGantt?: boolean;
};

function BrazeCoreGanttActivityRow({
  rowTiles,
  laneLegend,
  workstreamLaneColorOverrides,
  planOptionId,
  durationWeeks,
  timelineColumns,
  readOnly,
  onOpenTile,
  matchAiDecisioningSwimlaneBars,
  adsTileCategoryColors,
  categoryMilestoneFill,
  timelineGuideStyle,
  spanResize,
  leftRailExtra,
  brazeExpandedFirstRowChrome,
  ganttExpandedSectionActivityRow = false,
  explicitWorkstreamLabelTypes,
  enterprisePlanTaskGantt = false,
  useDefaultBrandWorkstreamColors = false,
}: BrazeCoreGanttActivityRowProps) {
  const headerClickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wsId = rowTiles[0]!.Workstream;
  const color = resolveWorkstreamColor(wsId, laneLegend, workstreamLaneColorOverrides);
  const laneAssigned = assignLanesInRow(rowTiles, planOptionId, durationWeeks);
  const maxLane = laneAssigned.reduce((m, x) => Math.max(m, x.lane), 0);
  const barYOffset = brazeExpandedFirstRowChrome ? BRAZE_CORE_GANTT_EXPANDED_FIRST_ROW_CHROME_PX : 0;
  const rowMinH = rowTimelineMinHeightPx(maxLane) + barYOffset;

  const titleOrder = [...rowTiles]
    .filter((t) => t.Category !== "milestone")
    .sort(sortTilesForWorkstream);

  const primaryTile =
    titleOrder.find((t) => t.Category === "onboarding_session") ??
    titleOrder.find((t) => t.Category === "customer_activity");
  const leftRailBg = matchAiDecisioningSwimlaneBars
    ? primaryTile?.Category === "onboarding_session"
      ? adsTileCategoryColors.onboardingBg
      : adsTileCategoryColors.customerBg
    : color;
  const leftRailLabelColor = matchAiDecisioningSwimlaneBars
    ? primaryTile?.Category === "onboarding_session"
      ? textColorOnTileBackground(adsTileCategoryColors.onboardingBg)
      : textColorOnTileBackground(adsTileCategoryColors.customerBg)
    : labelHexForWorkstreamTextType(
        resolveWorkstreamLabelTextType(
          explicitWorkstreamLabelTypes,
          wsId,
          color,
          useDefaultBrandWorkstreamColors,
        ),
      );

  const bars = laneAssigned.map(({ tile, lane }) => {
    const layoutEditable = !enterprisePlanTaskGantt || planGanttTileLayoutEditable(tile, planOptionId);
    const TaskBar = !readOnly && layoutEditable ? GanttTaskBarDraggable : GanttTaskBarStatic;
    const tu = getTileTimelineUnits(planOptionId, tile, durationWeeks);
    const spanUnits = tu.endUnit - tu.startUnit + 1;
    const leftPct = ((tu.startUnit - 1) / timelineColumns) * 100;
    const widthPct = (spanUnits / timelineColumns) * 100;
    const topPx =
      GANTT_ROW_TOP_PAD_PX +
      barYOffset +
      lane * (GANTT_TASK_BAR_HEIGHT_PX + GANTT_TASK_BAR_LANE_GAP_PX);
    const frameStyle: CSSProperties = {
      position: "absolute",
      left: `${leftPct}%`,
      width: `${Math.max(widthPct, 0.4)}%`,
      minWidth: 4,
      top: topPx,
      height: GANTT_TASK_BAR_HEIGHT_PX,
    };
    return (
      <Fragment key={tileKey(tile)}>
        <TaskBar
          tile={tile}
          workstreamHue={color}
          matchAiDecisioningSwimlaneBars={matchAiDecisioningSwimlaneBars}
          adsTileCategoryColors={adsTileCategoryColors}
          categoryMilestoneFill={categoryMilestoneFill}
          leftPct={leftPct}
          widthPct={widthPct}
          topPx={topPx}
          onOpen={() => onOpenTile(tile)}
        />
        {spanResize && !readOnly && tile.Category !== "milestone" && layoutEditable ? (
          <div className="pointer-events-none absolute z-[40]" style={frameStyle}>
            <BrazeCoreSpanResizeHandle
              tile={tile}
              planOptionId={spanResize.planOptionId}
              durationWeeks={spanResize.durationWeeks}
              timelineColumns={spanResize.timelineColumns}
              templateSpanWeeks={spanResize.templateSpanWeeksForTile(tile)}
              minSpanWeeks={spanResize.minSpanWeeksForTile?.(tile)}
              maxSpanWeeks={spanResize.maxSpanWeeksForTile?.(tile)}
              getTimelineWidthPx={spanResize.getTimelineWidthPx}
              spanResizeDragColumns={spanResize.spanResizeDragColumns}
              onSpanChange={(span) => spanResize.onSpanChange(tile, span)}
              heightClass="h-8"
              mode={spanResize.spanResizeMode ?? "braze"}
              handleHeightPx={spanResize.spanResizeHandleHeightPx ?? GANTT_TASK_BAR_HEIGHT_PX}
            />
          </div>
        ) : null}
      </Fragment>
    );
  });

  const rail =
    readOnly ? (
      <GanttRowTimelineRailStatic minHeight={rowMinH} timelineGuideStyle={timelineGuideStyle}>
        {bars}
      </GanttRowTimelineRailStatic>
    ) : (
      <GanttRowTimelineRailDroppable
        workstream={wsId}
        minHeight={rowMinH}
        timelineGuideStyle={timelineGuideStyle}
      >
        {bars}
      </GanttRowTimelineRailDroppable>
    );

  return (
    <div className="grid grid-cols-[minmax(12rem,16rem)_1fr] border-b border-[#ebe4ff]">
      <div
        className={clsx(
          "flex flex-col border-r border-[#E8E5F8] px-3 py-1",
          brazeExpandedFirstRowChrome ? "justify-start gap-1" : "justify-center gap-1",
        )}
        style={{ backgroundColor: leftRailBg }}
      >
        {brazeExpandedFirstRowChrome ? (
          <>
            <div
              className={clsx(
                "flex w-full min-w-0 items-center gap-2",
                brazeExpandedFirstRowChrome.sectionSortEnabled &&
                  "cursor-grab touch-manipulation active:cursor-grabbing",
                "cursor-pointer",
              )}
              style={{ color: leftRailLabelColor }}
              {...brazeExpandedFirstRowChrome.sectionSortRailProps}
              onClick={() =>
                scheduleDeferredSingleClick(headerClickTimerRef, () =>
                  brazeExpandedFirstRowChrome.onCollapse(),
                )
              }
            >
              <span
                className="min-w-0 flex-1 text-left text-[13px] font-bold leading-snug tracking-wide drop-shadow-sm"
                style={{ color: leftRailLabelColor }}
                onDoubleClick={(e) => {
                  cancelDeferredSingleClick(headerClickTimerRef);
                  e.stopPropagation();
                  brazeExpandedFirstRowChrome.onLabelDoubleClick?.();
                }}
              >
                {brazeExpandedFirstRowChrome.label}
              </span>
              <button
                type="button"
                className="flex shrink-0 items-center justify-center rounded-md p-0.5 text-current hover:bg-black/10"
                aria-expanded
                aria-label={`Collapse ${brazeExpandedFirstRowChrome.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  cancelDeferredSingleClick(headerClickTimerRef);
                  brazeExpandedFirstRowChrome.onCollapse();
                }}
              >
                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            </div>
            <div
              className="h-px w-full shrink-0"
              style={{ backgroundColor: leftRailLabelColor }}
              aria-hidden
            />
          </>
        ) : (
          leftRailExtra
        )}
        {titleOrder.map((tile) => (
          <button
            key={tileKey(tile)}
            type="button"
            className={clsx(
              "text-left leading-snug hover:underline",
              ganttExpandedSectionActivityRow
                ? "pl-2 text-[11px] font-medium opacity-90"
                : clsx(
                    "font-semibold drop-shadow-sm",
                    matchAiDecisioningSwimlaneBars ? "text-[14px]" : "text-[12px]",
                  ),
            )}
            style={{ color: leftRailLabelColor }}
            onClick={() => onOpenTile(tile)}
          >
            {tile.Title}
          </button>
        ))}
      </div>
      {rail}
    </div>
  );
}

export function BrazeCoreGanttChart({
  tiles,
  showOnboardingSessions,
  planOptionId,
  durationWeeks,
  timelineColumns,
  timelineConfig,
  showMonthsRow,
  showWeeksRow,
  phaseGridSpans,
  monthGridSpans,
  onOpenTile,
  readOnly = true,
  timelineRailRef,
  spanResize,
  laneLegend,
  laneLegendTitle = "Workstreams",
  matchAiDecisioningSwimlaneBars = false,
  aiDecisioningCategoryColors,
  workstreamLaneColorOverrides,
  legendProspectLabel,
  handsOnKeyboardSupport = false,
  legendPartnerLabel,
  explicitWorkstreamLabelTypes,
  onWorkstreamLabelTextDoubleClick,
  onAppendTimelineAnnotationAtColumn,
  timelineAnnotation,
  onTimelineAnnotationChange,
  onAfterAnnotationTitleCommit,
  timelineDates,
  timelinePeriodDatesEditable = false,
  onTimelineDateCommit,
  enterprisePlanTaskGantt = false,
  useDefaultBrandWorkstreamColors = false,
  sectionSortEnabled = false,
}: BrazeCoreGanttChartProps) {
  const ganttAnnotationTrackRef = useRef<HTMLDivElement>(null);
  const ganttRailLocalRef = useRef<HTMLDivElement | null>(null);
  const setGanttTimelineRailNode = useCallback(
    (el: HTMLDivElement | null) => {
      ganttRailLocalRef.current = el;
      if (!timelineRailRef) return;
      if (typeof timelineRailRef === "function") {
        (timelineRailRef as (instance: HTMLDivElement | null) => void)(el);
      } else {
        (timelineRailRef as { current: HTMLDivElement | null }).current = el;
      }
    },
    [timelineRailRef],
  );

  const prospectKeyName = (legendProspectLabel ?? "").trim() || "Prospect";
  const prospectActivityKeyLabel = `${prospectKeyName} Activity`;
  const partnerKeyName = (legendPartnerLabel ?? "").trim() || "Partner";
  const partnerActivityKeyLabel = `${partnerKeyName} Activity`;
  const adsTileCategoryColorsResolved = useMemo(
    () => resolveTileCategoryColorsFromConfig(aiDecisioningCategoryColors ?? {}),
    [
      aiDecisioningCategoryColors?.onboardingSessionTileColor,
      aiDecisioningCategoryColors?.customerActivityTileColor,
    ],
  );

  /** AI Gantt key: combo swatch uses a border only when customer color is the default (not a custom hex). */
  const adsGanttKeyCustomerComboUsesBorder = useMemo(
    () => parseHexColorOptional(aiDecisioningCategoryColors?.customerActivityTileColor) === undefined,
    [aiDecisioningCategoryColors?.customerActivityTileColor],
  );

  const categoryMilestoneFill = useMemo(
    () => milestoneAccentHexFromConfig(aiDecisioningCategoryColors ?? {}),
    [
      aiDecisioningCategoryColors?.onboardingSessionTileColor,
      aiDecisioningCategoryColors?.customerActivityTileColor,
    ],
  );

  const aiGanttMilestoneLegendHue = categoryMilestoneFill ?? ADS_GANTT_MILESTONE_ACCENT;

  const visibleGanttTiles = useMemo(() => {
    let list = matchAiDecisioningSwimlaneBars
      ? showOnboardingSessions
        ? tiles
        : tiles.filter((tile) => tile.Category !== "onboarding_session")
      : tiles.filter((tile) => tile.Category !== "onboarding_session");
    if (matchAiDecisioningSwimlaneBars) {
      list = list.filter((t) => !ADS_GANTT_OMIT_TILE_IDS.has(t.Tile_ID));
    }
    return list;
  }, [tiles, showOnboardingSessions, matchAiDecisioningSwimlaneBars]);
  const ganttRows = useMemo(() => {
    if (enterprisePlanTaskGantt) {
      const ids = laneLegend?.map((l) => l.id);
      return buildGanttRowsForPlanTaskList(visibleGanttTiles, ids?.length ? ids : undefined);
    }
    if (laneLegend?.length) {
      const ids = laneLegend.map((l) => l.id);
      if (matchAiDecisioningSwimlaneBars) {
        return buildGanttRowsByLaneOrder(visibleGanttTiles, ids);
      }
      return buildGanttRowsByWorkstream(visibleGanttTiles, ids);
    }
    return buildGanttRowsByWorkstream(visibleGanttTiles);
  }, [visibleGanttTiles, laneLegend, matchAiDecisioningSwimlaneBars, enterprisePlanTaskGantt]);

  const streamLegendRows = useMemo(() => {
    if (laneLegend?.length) return laneLegend;
    return WORKSTREAMS.map((ws) => ({
      id: ws.id,
      label: ws.label,
      color: workstreamLaneColorOverrides?.get(ws.id) ?? ws.color,
    }));
  }, [laneLegend, workstreamLaneColorOverrides]);

  /**
   * Braze Core Gantt category key (prospect activity + onboarding): single accent from the workstream
   * legend palette — the darkest hex among those lane colors (covers custom gradient endpoints).
   */
  const brazeGanttKeyWorkstreamAccentHex = useMemo(() => {
    const colors = streamLegendRows.map((r) => r.color);
    if (colors.length === 0) return WORKSTREAMS[0]!.color;
    return colors.reduce((darkest, c) => darkerOfTwoHexes(darkest, c));
  }, [streamLegendRows]);

  /**
   * Braze Core Gantt key milestone star: same rule as milestone bars — custom category milestone
   * accent when set; otherwise each bar uses its workstream hue, so the key uses the darkest lane
   * swatch (same pool as the workstream legend).
   */
  const brazeGanttKeyMilestoneStarHue = useMemo(
    () => categoryMilestoneFill ?? brazeGanttKeyWorkstreamAccentHex,
    [categoryMilestoneFill, brazeGanttKeyWorkstreamAccentHex],
  );

  const [expandedBrazeWorkstreams, setExpandedBrazeWorkstreams] = useState(
    () => new Set<Workstream>(),
  );

  const brazeWorkstreamSections = useMemo(() => {
    if (matchAiDecisioningSwimlaneBars) return null;
    return groupBrazeGanttRowsByWorkstream(ganttRows);
  }, [ganttRows, matchAiDecisioningSwimlaneBars]);

  const orderedBrazeWorkstreamSections = useMemo(() => {
    if (!brazeWorkstreamSections) return null;
    const order = laneLegend?.map((l) => l.id) ?? DEFAULT_BRAZE_GANTT_LANE_ORDER;
    const indexOf = (ws: Workstream) => {
      const i = order.indexOf(ws);
      return i < 0 ? 999 : i;
    };
    return [...brazeWorkstreamSections].sort(
      (a, b) => indexOf(a.workstream) - indexOf(b.workstream),
    );
  }, [brazeWorkstreamSections, laneLegend]);

  const platinumGanttSectionSortActive = Boolean(
    sectionSortEnabled && enterprisePlanTaskGantt && orderedBrazeWorkstreamSections?.length,
  );

  const useBrazeGanttSectionBlocks = Boolean(
    !matchAiDecisioningSwimlaneBars &&
      orderedBrazeWorkstreamSections &&
      orderedBrazeWorkstreamSections.length > 0,
  );

  const toggleBrazeWorkstreamExpanded = useCallback((ws: Workstream) => {
    setExpandedBrazeWorkstreams((prev) => {
      const next = new Set(prev);
      if (next.has(ws)) next.delete(ws);
      else next.add(ws);
      return next;
    });
  }, []);

  const showColumnGuides = showMonthsRow || planOptionId === "growth_silver";
  const timelineGuideStyle = useMemo(() => {
    if (!showColumnGuides) return undefined;
    return buildGanttTimelineColumnGuidesStyle({
      planOptionId,
      timelineColumns,
      durationWeeks,
      showMonthsRow,
      monthGridSpans,
    });
  }, [
    showColumnGuides,
    planOptionId,
    timelineColumns,
    durationWeeks,
    showMonthsRow,
    monthGridSpans.join(","),
  ]);

  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex flex-col gap-2 border-b border-[#E8E5F8] px-1 pb-2 text-sm text-[#2F2354]">
        <div className="text-[11px] leading-snug sm:text-[12px]">
        {matchAiDecisioningSwimlaneBars ? (
          <div className="flex flex-col gap-3 text-[12px] leading-snug">
            <p className="font-semibold text-[#2c1650]">AI Decisioning Studio Key</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="inline-flex items-center gap-2">
                <Star
                  size={26}
                  className="shrink-0"
                  fill={aiGanttMilestoneLegendHue}
                  color={aiGanttMilestoneLegendHue}
                  stroke={aiGanttMilestoneLegendHue}
                  aria-hidden
                />
                <span className="font-semibold" style={{ color: aiGanttMilestoneLegendHue }}>
                  Key Milestone
                </span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block shrink-0 rounded-md shadow-sm"
                  style={{
                    backgroundColor: adsTileCategoryColorsResolved.onboardingBg,
                    height: ADS_GANTT_LEGEND_SWATCH_H_PX,
                    width: ADS_GANTT_LEGEND_SWATCH_W_PX,
                  }}
                  aria-hidden
                />
                <span>
                  <span className="font-semibold text-[#2c1650]">
                    Primarily BrazeAI Decisioning Studio™
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className={clsx(
                    "inline-block shrink-0 rounded-md shadow-sm",
                    adsGanttKeyCustomerComboUsesBorder && "border-2",
                  )}
                  style={{
                    ...(adsGanttKeyCustomerComboUsesBorder
                      ? { borderColor: adsTileCategoryColorsResolved.customerBorder }
                      : {}),
                    backgroundColor: adsTileCategoryColorsResolved.customerBg,
                    height: ADS_GANTT_LEGEND_SWATCH_H_PX,
                    width: ADS_GANTT_LEGEND_SWATCH_W_PX,
                  }}
                  aria-hidden
                />
                <span>
                  <span className="font-semibold text-[#2c1650]">
                    Combination of BrazeAI Decisioning Studio™ and {prospectKeyName}
                  </span>
                </span>
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[12px] leading-snug text-[#2F2354]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-2">
              <span className="font-semibold text-[#2c1650]">Key</span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-6 w-10 rounded border-0 shadow-sm"
                  style={{ backgroundColor: brazeGanttKeyWorkstreamAccentHex }}
                  aria-hidden
                />
                <span className="font-medium text-[#2c1650]">{prospectActivityKeyLabel}</span>
              </span>
              {handsOnKeyboardSupport ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-6 w-10 shrink-0 rounded border-2 bg-white shadow-sm ring-1 ring-black/5"
                    style={{ borderColor: brazeGanttKeyWorkstreamAccentHex }}
                    aria-hidden
                  />
                  <span className="font-medium text-[#2c1650]">{partnerActivityKeyLabel}</span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-flex h-6 w-10 items-center justify-center rounded border-2 border-white bg-white shadow-sm ring-1 ring-black/5"
                  aria-hidden
                >
                  <Star
                    size={16}
                    style={{ color: brazeGanttKeyMilestoneStarHue }}
                    fill={brazeGanttKeyMilestoneStarHue}
                    stroke={brazeGanttKeyMilestoneStarHue}
                  />
                </span>
                <span className="font-medium text-[#2c1650]">Project Milestone</span>
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#f0ebfb] pt-3">
              <span className="font-semibold uppercase tracking-wide text-[#6B5A9A]">
                {laneLegendTitle}
              </span>
              {streamLegendRows.map((ws) => (
                <span key={`${ws.id}::${ws.label}`} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-4 w-7 shrink-0 rounded shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: ws.color }}
                    aria-hidden
                  />
                  <span className="max-w-[11rem] truncate text-[#2F2354]" title={ws.label}>
                    {ws.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto">
        <TimelineAnnotationsShell
          timelineColumns={timelineColumns}
          document={timelineAnnotation ?? { annotations: [] }}
          onDocumentChange={onTimelineAnnotationChange ?? (() => {})}
          readOnly={readOnly || !onTimelineAnnotationChange}
          railRef={ganttRailLocalRef}
          trackRef={ganttAnnotationTrackRef}
          onAfterAnnotationTitleCommit={onAfterAnnotationTitleCommit}
        >
          <div className="min-w-[min(100%,720px)]">
          <div className="grid grid-cols-[minmax(12rem,16rem)_1fr] border-b border-[#E8E5F8]">
            <div className="border-r border-[#E8E5F8] px-3 py-3 text-base font-semibold text-[#300266]">
              Activity
            </div>
            <div
              ref={setGanttTimelineRailNode}
              className="grid"
              style={{ gridTemplateColumns: `repeat(${timelineColumns}, minmax(0, 1fr))` }}
              onDoubleClick={(e) => {
                if (readOnly || !onAppendTimelineAnnotationAtColumn) return;
                const col = timelineColumnFromClientX(e.currentTarget, e.clientX, timelineColumns);
                onAppendTimelineAnnotationAtColumn(col);
              }}
            >
              {timelineConfig.phases.map((phase, i) => (
                <div
                  key={`phase-${phase.name}`}
                  className="border-l border-[#E8E5F8] px-2 py-3 text-center text-sm font-semibold text-[#4C3B78]"
                  style={{ gridColumn: `span ${phaseGridSpans[i]!}` }}
                >
                  {phase.name}
                </div>
              ))}
            </div>
          </div>

          {showMonthsRow && (
            <div className="grid grid-cols-[minmax(12rem,16rem)_1fr] border-b border-[#E8E5F8]">
              <div className="border-r border-[#E8E5F8] px-3 py-3 text-base font-semibold text-[#300266]">
                Months
              </div>
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${timelineColumns}, minmax(0, 1fr))` }}
              >
                {timelineConfig.months.map((month, i) => (
                  <div
                    key={`month-${month.name}`}
                    className="border-l border-[#E8E5F8] px-2 py-3 text-center text-sm font-semibold text-[#6B5A9A]"
                    style={{ gridColumn: `span ${monthGridSpans[i]!}` }}
                  >
                    <EditableTimelinePeriodLabel
                      index={i}
                      fallbackLabel={month.name}
                      isoDate={timelineDates?.[i]}
                      timelineDates={timelineDates}
                      editable={timelinePeriodDatesEditable && Boolean(onTimelineDateCommit)}
                      onCommit={(index, isoDate) => onTimelineDateCommit?.(index, isoDate)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {showWeeksRow && (
            <div className="grid grid-cols-[minmax(12rem,16rem)_1fr] border-b border-[#E8E5F8]">
              <div className="border-r border-[#E8E5F8] px-3 py-3 text-base font-semibold text-[#300266]">
                Weeks
              </div>
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${timelineColumns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: durationWeeks }, (_, index) => (
                  <div
                    key={index + 1}
                    className="border-l border-[#E8E5F8] px-2 py-2 text-center text-xs font-semibold text-[#6B5A9A] sm:px-3 sm:py-3 sm:text-sm"
                    style={{ gridColumn: `span ${GROWTH_SILVER_COLUMNS_PER_WEEK}` }}
                  >
                    <EditableTimelinePeriodLabel
                      index={index}
                      fallbackLabel={`Week ${index + 1}`}
                      isoDate={timelineDates?.[index]}
                      timelineDates={timelineDates}
                      editable={timelinePeriodDatesEditable && Boolean(onTimelineDateCommit)}
                      onCommit={(idx, isoDate) => onTimelineDateCommit?.(idx, isoDate)}
                      className="block w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchAiDecisioningSwimlaneBars || !useBrazeGanttSectionBlocks
            ? ganttRows.map((rowTiles) => (
                <BrazeCoreGanttActivityRow
                  key={rowTiles.map(tileKey).join("|")}
                  rowTiles={rowTiles}
                  laneLegend={laneLegend}
                  workstreamLaneColorOverrides={workstreamLaneColorOverrides}
                  planOptionId={planOptionId}
                  durationWeeks={durationWeeks}
                  timelineColumns={timelineColumns}
                  readOnly={readOnly}
                  onOpenTile={onOpenTile}
                  matchAiDecisioningSwimlaneBars={matchAiDecisioningSwimlaneBars}
                  adsTileCategoryColors={adsTileCategoryColorsResolved}
                  categoryMilestoneFill={categoryMilestoneFill}
                  timelineGuideStyle={timelineGuideStyle}
                  spanResize={spanResize}
                  explicitWorkstreamLabelTypes={explicitWorkstreamLabelTypes}
                  enterprisePlanTaskGantt={enterprisePlanTaskGantt}
                  useDefaultBrandWorkstreamColors={useDefaultBrandWorkstreamColors}
                />
              ))
            : (() => {
                const sections = orderedBrazeWorkstreamSections!;
                const sectionNodes = sections.flatMap(
                  ({ workstream: sectionWs, rows: sectionRows }) => {
                const expanded = expandedBrazeWorkstreams.has(sectionWs);
                const wsLabel =
                  laneLegend?.find((l) => l.id === sectionWs)?.label ??
                  WORKSTREAMS.find((w) => w.id === sectionWs)?.label ??
                  sectionWs;

                if (!expanded) {
                  const expandSection = () => toggleBrazeWorkstreamExpanded(sectionWs);
                  const wsColor = resolveWorkstreamColor(
                    sectionWs,
                    laneLegend,
                    workstreamLaneColorOverrides,
                  );
                  const collapsedLeftType = resolveWorkstreamLabelTextType(
                    explicitWorkstreamLabelTypes,
                    sectionWs,
                    wsColor,
                    useDefaultBrandWorkstreamColors,
                  );
                  const collapsedLeftColor = labelHexForWorkstreamTextType(collapsedLeftType);
                  /** Collapsed rail: customer activities only (ignore onboarding sessions even when Gantt shows them). */
                  const flatTiles = sectionRows
                    .flat()
                    .filter((t) => t.Category === "customer_activity");
                  const collapsedRowMinH = rowTimelineMinHeightPx(0);
                  const collapsedSegments = buildCollapsedWorkstreamUnionSegments(
                    flatTiles,
                    planOptionId,
                    durationWeeks,
                    timelineColumns,
                  );
                  const collapsedBarFg = labelHexForWorkstreamTextType(
                    resolveWorkstreamLabelTextType(
                      explicitWorkstreamLabelTypes,
                      sectionWs,
                      wsColor,
                      useDefaultBrandWorkstreamColors,
                    ),
                  );
                  const collapsedBars = collapsedSegments.map((seg) => {
                    const spanUnits = seg.endUnit - seg.startUnit + 1;
                    const leftPct = ((seg.startUnit - 1) / timelineColumns) * 100;
                    const widthPct = (spanUnits / timelineColumns) * 100;
                    const topPx = GANTT_ROW_TOP_PAD_PX;
                    const overlapping = customerActivityTilesOverlappingUnits(
                      flatTiles,
                      seg.startUnit,
                      seg.endUnit,
                      planOptionId,
                      durationWeeks,
                    );
                    const titles = overlapping.map((t) => t.Title).join(" · ");
                    const key = `${seg.startUnit}-${seg.endUnit}`;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-label={titles || wsLabel}
                        title={titles || wsLabel}
                        className="absolute z-[30] flex items-center justify-center gap-1 overflow-hidden rounded-md border-0 px-1.5 text-center text-[9px] font-medium leading-tight shadow-sm"
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.max(widthPct, 0.4)}%`,
                          minWidth: 4,
                          top: topPx,
                          height: GANTT_TASK_BAR_HEIGHT_PX,
                          backgroundColor: wsColor,
                          color: collapsedBarFg,
                        }}
                        onClick={expandSection}
                      />
                    );
                  });

                  const collapsedRail = (
                    <GanttRowTimelineRailStatic
                      minHeight={collapsedRowMinH}
                      timelineGuideStyle={timelineGuideStyle}
                    >
                      {collapsedBars}
                    </GanttRowTimelineRailStatic>
                  );

                  return [
                    <GanttPlatinumSectionSortable
                      key={`braze-collapsed-${sectionWs}`}
                      sectionWs={sectionWs}
                      sortEnabled={platinumGanttSectionSortActive}
                    >
                      {(sectionSortRailProps) => (
                        <div className="grid grid-cols-[minmax(12rem,16rem)_1fr] border-b border-[#ebe4ff]">
                          <div
                            className={clsx(
                              "flex items-center gap-2 border-r border-[#E8E5F8] px-3 py-1",
                              platinumGanttSectionSortActive &&
                                "cursor-grab touch-manipulation active:cursor-grabbing",
                              "cursor-pointer",
                            )}
                            style={{
                              backgroundColor: wsColor,
                              color: collapsedLeftColor,
                            }}
                            {...sectionSortRailProps}
                            onClick={expandSection}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                expandSection();
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-expanded={false}
                            aria-label={`Expand ${wsLabel}`}
                          >
                            <button
                              type="button"
                              className="flex shrink-0 items-center justify-center rounded-md p-1 hover:bg-black/10"
                              aria-hidden
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation();
                                expandSection();
                              }}
                            >
                              <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                            </button>
                            <span
                              className="text-left text-[12px] font-semibold leading-snug drop-shadow-sm"
                              title={
                                onWorkstreamLabelTextDoubleClick
                                  ? "Double-click to change label contrast"
                                  : undefined
                              }
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                onWorkstreamLabelTextDoubleClick?.(sectionWs);
                              }}
                            >
                              {wsLabel}
                            </span>
                          </div>
                          {collapsedRail}
                        </div>
                      )}
                    </GanttPlatinumSectionSortable>,
                  ];
                }

                return [
                  <GanttPlatinumSectionSortable
                    key={`braze-expanded-${sectionWs}`}
                    sectionWs={sectionWs}
                    sortEnabled={platinumGanttSectionSortActive}
                  >
                    {(sectionSortRailProps) => (
                      <>
                        {sectionRows.map((rowTiles, rowIdx) => (
                          <BrazeCoreGanttActivityRow
                            key={rowTiles.map(tileKey).join("|")}
                            rowTiles={rowTiles}
                            laneLegend={laneLegend}
                            workstreamLaneColorOverrides={workstreamLaneColorOverrides}
                            planOptionId={planOptionId}
                            durationWeeks={durationWeeks}
                            timelineColumns={timelineColumns}
                            readOnly={readOnly}
                            onOpenTile={onOpenTile}
                            matchAiDecisioningSwimlaneBars={false}
                            adsTileCategoryColors={adsTileCategoryColorsResolved}
                            categoryMilestoneFill={categoryMilestoneFill}
                            timelineGuideStyle={timelineGuideStyle}
                            spanResize={spanResize}
                            brazeExpandedFirstRowChrome={
                              rowIdx === 0
                                ? {
                                    label: wsLabel,
                                    onCollapse: () => toggleBrazeWorkstreamExpanded(sectionWs),
                                    onLabelDoubleClick: () =>
                                      onWorkstreamLabelTextDoubleClick?.(sectionWs),
                                    sectionSortEnabled: platinumGanttSectionSortActive,
                                    sectionSortRailProps: sectionSortRailProps,
                                  }
                                : undefined
                            }
                            ganttExpandedSectionActivityRow
                            explicitWorkstreamLabelTypes={explicitWorkstreamLabelTypes}
                            enterprisePlanTaskGantt={enterprisePlanTaskGantt}
                            useDefaultBrandWorkstreamColors={useDefaultBrandWorkstreamColors}
                          />
                        ))}
                      </>
                    )}
                  </GanttPlatinumSectionSortable>,
                ];
                  },
                );
                if (!platinumGanttSectionSortActive) return sectionNodes;
                return (
                  <SortableContext
                    items={sections.map(
                      (s) => `${BRAZE_WS_SORT_PREFIX}${s.workstream}`,
                    )}
                    strategy={verticalListSortingStrategy}
                  >
                    {sectionNodes}
                  </SortableContext>
                );
              })()}
        </div>
        </TimelineAnnotationsShell>
      </div>
    </div>
  );
}
