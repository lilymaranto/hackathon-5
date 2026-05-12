"use client";

import { BrazeCoreSpanResizeHandle } from "@/components/BrazeCoreSpanResizeHandle";
import { GROWTH_SILVER_COLUMNS_PER_WEEK, WORKSTREAMS } from "@/lib/constants";
import { getTileTimelineUnits } from "@/lib/timeline-units";
import type { TimelineConfig } from "@/lib/templates";
import type { PlanOptionId, TileRecord, Workstream } from "@/lib/types";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { Star } from "lucide-react";
import type { CSSProperties, ReactNode, Ref } from "react";
import { Fragment, useMemo } from "react";

const GANTT_GUIDE_COLOR = "rgba(232, 229, 248, 0.95)";

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
  onSpanChange: (tile: TileRecord, span: number) => void;
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
};

/** Must match {@link CanvasBoard} `tileStableKey` for shared DnD ids. */
function tileStableKey(tile: TileRecord): string {
  return tile.CaboodlePatchKey ?? `${tile.Config_ID}__${tile.Tile_ID}`;
}

const WEEKLY_ALIGNMENT_TILE_ID = "weekly_alignment";
/** Campaign: optional phase 2 is always its own row (after phase 1 + milestone block). */
const CAMPAIGN_PHASE_2_TILE_IDS = new Set(["launch_phase_2", "phase_2_optional"]);

/** Matches {@link GanttTaskBar} bar height (`h-8`). */
const GANTT_BAR_HEIGHT_PX = 32;
const GANTT_BAR_LANE_GAP_PX = 4;
/** Vertical inset above lane 0 / below last lane — kept small so rows hug single tiles. */
const GANTT_ROW_TOP_PAD_PX = 4;

function tileKey(tile: TileRecord): string {
  return tile.CaboodlePatchKey ?? `${tile.Config_ID}__${tile.Tile_ID}`;
}

function workstreamColor(workstreamId: Workstream): string {
  return WORKSTREAMS.find((w) => w.id === workstreamId)?.color ?? "#300266";
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
function buildGanttRowsByWorkstream(tiles: TileRecord[]): TileRecord[][] {
  const byWs = new Map<Workstream, TileRecord[]>();
  for (const t of tiles) {
    const list = byWs.get(t.Workstream) ?? [];
    list.push(t);
    byWs.set(t.Workstream, list);
  }

  const out: TileRecord[][] = [];

  for (const ws of WORKSTREAMS) {
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

function rowTimelineMinHeightPx(maxLane: number): number {
  const lanes = maxLane + 1;
  return (
    GANTT_ROW_TOP_PAD_PX * 2 +
    lanes * GANTT_BAR_HEIGHT_PX +
    Math.max(0, lanes - 1) * GANTT_BAR_LANE_GAP_PX
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
      className="relative bg-white"
      style={ganttRowRailStyle(minHeight, timelineGuideStyle)}
    >
      {children}
    </div>
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
      className="relative bg-white"
      style={ganttRowRailStyle(minHeight, timelineGuideStyle)}
    >
      {children}
    </div>
  );
}

function GanttTaskBarDraggable({
  tile,
  workstreamHue,
  leftPct,
  widthPct,
  topPx,
  onOpen,
}: {
  tile: TileRecord;
  workstreamHue: string;
  leftPct: number;
  widthPct: number;
  topPx: number;
  onOpen: () => void;
}) {
  const cat = tile.Category;
  const solidFill = workstreamHue;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tileStableKey(tile),
  });

  const posStyle: CSSProperties = {
    left: `${leftPct}%`,
    width: `${Math.max(widthPct, 0.4)}%`,
    minWidth: 4,
    top: topPx,
    transform: CSS.Translate.toString(transform),
  };

  const common =
    "absolute flex h-8 items-center justify-center gap-1 overflow-hidden rounded-md px-1.5 text-center text-[13px] font-medium leading-tight shadow-sm";
  const grabClass = cat !== "milestone" ? "cursor-grab active:cursor-grabbing" : "";
  const draggingClass = isDragging ? "z-20 opacity-80" : "";

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

  const isMilestone = cat === "milestone";
  if (isMilestone) {
    return (
      <button
        ref={setNodeRef}
        type="button"
        aria-label={tile.Title}
        className={clsx(common, "z-[5] border-2 bg-white shadow-sm", draggingClass)}
        style={{
          ...posStyle,
          borderColor: "#ffffff",
          color: solidFill,
        }}
        onClick={onOpen}
        {...listeners}
        {...attributes}
      >
        <Star
          size={16}
          className="shrink-0"
          style={{ color: solidFill }}
          fill={solidFill}
          stroke={solidFill}
          aria-hidden
        />
        <span className="line-clamp-2 w-full font-semibold" style={{ color: solidFill }}>
          {tile.Title}
        </span>
      </button>
    );
  }

  if (cat === "customer_activity") {
    return (
      <button
        ref={setNodeRef}
        type="button"
        aria-label={tile.Title}
        title={tile.Title}
        className={clsx(common, "border-0 text-white", grabClass, draggingClass)}
        style={{
          ...posStyle,
          backgroundColor: solidFill,
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
      className={clsx(common, "border-0 text-white", grabClass, draggingClass)}
      style={{
        ...posStyle,
        backgroundColor: solidFill,
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
  leftPct,
  widthPct,
  topPx,
  onOpen,
}: {
  tile: TileRecord;
  workstreamHue: string;
  leftPct: number;
  widthPct: number;
  topPx: number;
  onOpen: () => void;
}) {
  const cat = tile.Category;
  const solidFill = workstreamHue;
  const posStyle: CSSProperties = {
    left: `${leftPct}%`,
    width: `${Math.max(widthPct, 0.4)}%`,
    minWidth: 4,
    top: topPx,
  };
  const common =
    "absolute flex h-8 items-center justify-center gap-1 overflow-hidden rounded-md px-1.5 text-center text-[13px] font-medium leading-tight shadow-sm";

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

  if (cat === "milestone") {
    return (
      <button
        type="button"
        aria-label={tile.Title}
        className={clsx(common, "z-[5] border-2 bg-white shadow-sm")}
        style={{
          ...posStyle,
          borderColor: "#ffffff",
          color: solidFill,
        }}
        onClick={onOpen}
      >
        <Star
          size={16}
          className="shrink-0"
          style={{ color: solidFill }}
          fill={solidFill}
          stroke={solidFill}
          aria-hidden
        />
        <span className="line-clamp-2 w-full font-semibold" style={{ color: solidFill }}>
          {tile.Title}
        </span>
      </button>
    );
  }

  if (cat === "customer_activity") {
    return (
      <button
        type="button"
        aria-label={tile.Title}
        title={tile.Title}
        className={clsx(common, "border-0 text-white")}
        style={{
          ...posStyle,
          backgroundColor: solidFill,
        }}
        onClick={onOpen}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={tile.Title}
      className={clsx(common, "border-0 text-white")}
      style={{
        ...posStyle,
        backgroundColor: solidFill,
      }}
      onClick={onOpen}
    >
      <span className="line-clamp-2 w-full">{tile.Title}</span>
    </button>
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
}: BrazeCoreGanttChartProps) {
  const categoryExampleHue = WORKSTREAMS[0]!.color;

  const visibleGanttTiles = useMemo(
    () =>
      showOnboardingSessions
        ? tiles
        : tiles.filter((tile) => tile.Category !== "onboarding_session"),
    [tiles, showOnboardingSessions],
  );
  const ganttRows = useMemo(
    () => buildGanttRowsByWorkstream(visibleGanttTiles),
    [visibleGanttTiles],
  );

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
      <div className="mb-4 flex flex-col gap-3 border-b border-[#E8E5F8] px-1 pb-3 text-base text-[#2F2354]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-semibold text-[#2c1650]">Key</span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-6 w-10 rounded border-0 shadow-sm"
              style={{ backgroundColor: categoryExampleHue }}
              aria-hidden
            />
            <span className="font-medium" style={{ color: categoryExampleHue }}>
              Customer Activity
            </span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-6 w-10 rounded border-2 bg-white shadow-sm"
              style={{ borderColor: categoryExampleHue }}
              aria-hidden
            />
            <span>Onboarding Session</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-flex h-6 w-10 items-center justify-center rounded border-2 border-white bg-white shadow-sm ring-1 ring-black/5"
              aria-hidden
            >
              <Star
                size={16}
                style={{ color: categoryExampleHue }}
                fill={categoryExampleHue}
                stroke={categoryExampleHue}
              />
            </span>
            <span>Project milestone</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#f0ebfb] pt-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-[#6B5A9A]">
            Workstreams
          </span>
          {WORKSTREAMS.map((ws) => (
            <span key={ws.id} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-4 w-7 shrink-0 rounded shadow-sm ring-1 ring-black/5"
                style={{ backgroundColor: ws.color }}
                aria-hidden
              />
              <span className="max-w-[11rem] truncate text-sm text-[#2F2354]" title={ws.label}>
                {ws.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto">
        <div className="min-w-[min(100%,720px)]">
          <div className="grid grid-cols-[minmax(12rem,16rem)_1fr] border-b border-[#E8E5F8]">
            <div className="border-r border-[#E8E5F8] px-3 py-3 text-base font-semibold text-[#300266]">
              Activity
            </div>
            <div
              ref={timelineRailRef}
              className="grid"
              style={{ gridTemplateColumns: `repeat(${timelineColumns}, minmax(0, 1fr))` }}
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
                    {month.name}
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
                    {`Week ${index + 1}`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {ganttRows.map((rowTiles) => {
            const wsId = rowTiles[0]!.Workstream;
            const color = workstreamColor(wsId);
            const laneAssigned = assignLanesInRow(rowTiles, planOptionId, durationWeeks);
            const maxLane = laneAssigned.reduce((m, x) => Math.max(m, x.lane), 0);
            const rowMinH = rowTimelineMinHeightPx(maxLane);
            const rowKey = rowTiles.map(tileKey).join("|");

            const titleOrder = [...rowTiles]
              .filter((t) => t.Category !== "milestone")
              .sort(sortTilesForWorkstream);

            return (
              <div
                key={rowKey}
                className="grid grid-cols-[minmax(12rem,16rem)_1fr] border-b border-[#ebe4ff]"
              >
                <div
                  className="flex flex-col justify-center gap-1 border-r border-[#E8E5F8] px-3 py-1"
                  style={{ backgroundColor: color }}
                >
                  {titleOrder.map((tile) => (
                    <button
                      key={tileKey(tile)}
                      type="button"
                      className="text-left text-base font-semibold leading-snug text-white drop-shadow-sm hover:underline"
                      onClick={() => onOpenTile(tile)}
                    >
                      {tile.Title}
                    </button>
                  ))}
                </div>
                {(() => {
                  const TaskBar = readOnly ? GanttTaskBarStatic : GanttTaskBarDraggable;
                  const bars = laneAssigned.map(({ tile, lane }) => {
                    const tu = getTileTimelineUnits(planOptionId, tile, durationWeeks);
                    const spanUnits = tu.endUnit - tu.startUnit + 1;
                    const leftPct = ((tu.startUnit - 1) / timelineColumns) * 100;
                    const widthPct = (spanUnits / timelineColumns) * 100;
                    const topPx =
                      GANTT_ROW_TOP_PAD_PX +
                      lane * (GANTT_BAR_HEIGHT_PX + GANTT_BAR_LANE_GAP_PX);
                    const frameStyle: CSSProperties = {
                      position: "absolute",
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 0.4)}%`,
                      minWidth: 4,
                      top: topPx,
                      height: GANTT_BAR_HEIGHT_PX,
                    };
                    return (
                      <Fragment key={tileKey(tile)}>
                        <TaskBar
                          tile={tile}
                          workstreamHue={color}
                          leftPct={leftPct}
                          widthPct={widthPct}
                          topPx={topPx}
                          onOpen={() => onOpenTile(tile)}
                        />
                        {spanResize && !readOnly && tile.Category !== "milestone" ? (
                          <div className="pointer-events-none" style={frameStyle}>
                            <BrazeCoreSpanResizeHandle
                              tile={tile}
                              planOptionId={spanResize.planOptionId}
                              durationWeeks={spanResize.durationWeeks}
                              timelineColumns={spanResize.timelineColumns}
                              templateSpanWeeks={spanResize.templateSpanWeeksForTile(tile)}
                              getTimelineWidthPx={spanResize.getTimelineWidthPx}
                              onSpanChange={(span) => spanResize.onSpanChange(tile, span)}
                              heightClass="h-8"
                            />
                          </div>
                        ) : null}
                      </Fragment>
                    );
                  });
                  return readOnly ? (
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
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
