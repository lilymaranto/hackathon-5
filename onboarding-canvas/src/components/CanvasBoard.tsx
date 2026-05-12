"use client";

import {
  BrazeCoreGanttChart,
  type BrazeCoreGanttSpanResizeProps,
} from "@/components/BrazeCoreGanttChart";
import { AddSwimlaneTilePanel } from "@/components/AddSwimlaneTilePanel";
import { BrazeCoreResourcesChart } from "@/components/BrazeCoreResourcesChart";
import { BrazeCoreSpanResizeHandle } from "@/components/BrazeCoreSpanResizeHandle";
import { TileDrawer } from "@/components/TileDrawer";
import {
  adsChevronDisplayTitle,
  ADS_CANVAS_LANE_IDS,
  AI_DECISIONING_GANTT_LANE_LEGEND,
  AI_DECISIONING_STUDIO_TIMELINE_WEEKS,
  ENTERPRISE_PLATINUM_TIMELINE_COLUMNS,
  IGNITE_GOLD_COLUMNS_PER_MONTH,
  IGNITE_SILVER_COLUMNS_PER_MONTH,
  IGNITE_SILVER_TIMELINE_COLUMNS,
  QUICKSTART_GOLD_COLUMNS_PER_MONTH,
  QUICKSTART_GOLD_TIMELINE_COLUMNS,
  WORKSTREAMS,
  GROWTH_SILVER_COLUMNS_PER_WEEK,
  getTimelineConfig,
  isWorkstreamVisibleForChannels,
} from "@/lib/constants";
import { getBrazeCoreResourceDrawerLinks } from "@/lib/braze-core-resources-data";
import { getTileTimelineUnits } from "@/lib/timeline-units";
import { ConfigRecord, PlanOptionId, TileCategory, TileRecord, Workstream } from "@/lib/types";
import {
  closestCorners,
  DndContext,
  type CollisionDetection,
  DragEndEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import clsx from "clsx";
import { ArrowBigDown, GripVertical, Plus, Star } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";

/** AI Decisioning lanes: prefer pointer-inside row hit targets so drops map to the lane under the cursor (default closest-center skewed toward lane one). */
const adsCollisionDetection: CollisionDetection = (args) => {
  const withinCollisions = pointerWithin(args);
  if (withinCollisions.length > 0) return withinCollisions;
  return closestCorners(args);
};

type Props = {
  config: ConfigRecord;
  /** Defaults to [] so dependency arrays / logs never read undefined.length (Fast Refresh edge cases). */
  tiles?: TileRecord[];
  readOnly?: boolean;
};

/** Stable row id for DnD/state (Caboodle **ID** column value = `{Config_ID}__{slug}`). */
function tileStableKey(tile: TileRecord): string {
  return tile.CaboodlePatchKey ?? `${tile.Config_ID}__${tile.Tile_ID}`;
}

type LayoutEditsMap = Record<
  string,
  Partial<Pick<TileRecord, "Start_Week" | "Workstream" | "Span_Weeks">>
>;

const MAX_LAYOUT_UNDO = 40;

function cloneLayoutEdits(edits: LayoutEditsMap): LayoutEditsMap {
  return structuredClone(edits);
}

function pushLayoutUndoSnapshot(stackRef: { current: LayoutEditsMap[] }, currentEdits: LayoutEditsMap) {
  stackRef.current.push(cloneLayoutEdits(currentEdits));
  while (stackRef.current.length > MAX_LAYOUT_UNDO) stackRef.current.shift();
}

const TILE_TOP_OFFSET = 10;
const TILE_HEIGHT_PX = 40;

/** AI Decisioning Studio chevron lane tiles (~3× legacy height; fits up to 3 lines of label). */
const ADS_CHEVRON_TILE_HEIGHT_PX = 108;
const ADS_CHEVRON_TOP_OFFSET_PX = 8;
const TILE_LANE_GAP = 8;
/**
 * When two same-category chevrons interlock, pull them slightly apart horizontally so the canvas
 * shows through as a gap (reference: chevron tips + notch stay visible; avoids a flat vertical bar).
 */
const ADS_CHEVRON_SAME_FILL_GAP_PX = 3;

/**
 * Target horizontal depth (px) for the right-hand tip / left receiver notch when the tile is wide
 * enough. Narrow tiles cap this with {@link adsEffectiveLaneNotchPx} so the polygon stays valid.
 */
const ADS_LANE_NOTCH_PX = 24;
/** Do not let the notch consume more than this fraction of a tile's width (avoids collapsed tips). */
const ADS_LANE_NOTCH_MAX_WIDTH_FRAC = 0.24;
const ADS_LANE_NOTCH_MIN_PX = 8;
/**
 * Vertical inset (% of tile height) before the diagonal runs to the tip. Larger = shorter diagonal =
 * visibly pointier apex without increasing n (pairs with capped n on narrow spans).
 */
const ADS_CHEVRON_TIP_SHOULDER_PCT = 0;

/**
 * Thin white rim that follows the clipped chevron silhouette. Tailwind `ring-*` is effectively a
 * box-edge halo and fights `clip-path`, which reads as fat wedges and broken tips — directional
 * drop-shadows use the post-clip alpha instead (keep this stack small for GPU cost).
 */
const ADS_CHEVRON_EDGE_FILTER = [
  "drop-shadow(0 1px 0 #fff)",
  "drop-shadow(0 -1px 0 #fff)",
  "drop-shadow(1px 0 0 #fff)",
  "drop-shadow(-1px 0 0 #fff)",
  "drop-shadow(1px 1px 0 #fff)",
  "drop-shadow(-1px 1px 0 #fff)",
  "drop-shadow(1px -1px 0 #fff)",
  "drop-shadow(-1px -1px 0 #fff)",
].join(" ");

function adsEffectiveLaneNotchPx(tileWidthPx: number): number {
  const w = Math.max(1, tileWidthPx);
  const cap = w * ADS_LANE_NOTCH_MAX_WIDTH_FRAC;
  return Math.round(Math.min(ADS_LANE_NOTCH_PX, Math.max(ADS_LANE_NOTCH_MIN_PX, cap)));
}

/** Estimated milestone pill height for bottom stacking (excludes caret below box). */
const ADS_MILESTONE_CARD_STACK_PX = 52;
const ADS_MILESTONE_BOTTOM_GAP_PX = 8;
/** Keeps top-band milestones snug to the chevron row below. */
const ADS_MILESTONE_BAND_BOTTOM_PADDING_PX = 3;
/** Space reserved below downward carets before the track (smaller = milestones sit closer). */
const ADS_MILESTONE_CARET_OVERFLOW_PX = 7;
/**
 * Pushes Go-live (random) below the anchor bar: upward caret (~10px) + small gap so it doesn’t
 * overlap the chevron clip-path.
 */
const ADS_GOLIVE_RANDOM_CLEARANCE_BELOW_ANCHOR_PX = 20;
/**
 * Symmetric inset for default layout: gap from Go-live (trained) caret → chevron bar matches gap from
 * Go-live (random) pill bottom → lane bottom (see {@link ADS_MS_GOLIVE_RANDOM_BODY_PX}).
 */
const ADS_MS_GOLIVE_EDGE_GUTTER_PX = 16;
/**
 * Approx. distance from `top` of below-bar Go-live (random) to bottom of its pill (caret-on-top,
 * typical title length). Increase if the pill clips at the bottom.
 */
const ADS_MS_GOLIVE_RANDOM_BODY_PX = 72;

function adsInterlockingClipPath(attachLeft: boolean, nPx: number): string {
  const n = Math.round(Math.max(ADS_LANE_NOTCH_MIN_PX, nPx));
  const s = ADS_CHEVRON_TIP_SHOULDER_PCT;
  if (attachLeft) {
    // Left side receiver notch (concave) so preceding bar's right tip can interlock.
    return `polygon(0% 0%, calc(100% - ${n}px) 0%, calc(100% - ${n}px) ${s}%, 100% 50%, calc(100% - ${n}px) calc(100% - ${s}%), calc(100% - ${n}px) 100%, 0% 100%, 0% calc(100% - ${s}%), ${n}px 50%, 0% ${s}%)`;
  }
  // No left neighbor: keep a flat back edge.
  return `polygon(0% 0%, calc(100% - ${n}px) 0%, calc(100% - ${n}px) ${s}%, 100% 50%, calc(100% - ${n}px) calc(100% - ${s}%), calc(100% - ${n}px) 100%, 0% 100%)`;
}

function isAdsGoliveMilestone(tile: TileRecord): boolean {
  return (
    tile.Tile_ID === "ads_ms_golive_random" || tile.Tile_ID === "ads_ms_golive_trained"
  );
}

/** Lane-two bar “Conduct post go-live testing” — Go-live (random) sits under this tile. */
const ADS_POST_GOLIVE_BAR_TILE_ID = "ads_lane2_post_golive_test";

type TileWithLane = TileRecord & { lane: number };

/** Left edge of a week column — milestones use a bottom-left caret on this line. */
function adsMilestoneWeekLeftPct(tile: TileRecord, timelineColumns: number): number {
  const w = Math.min(Math.max(tile.Start_Week, 1), timelineColumns);
  return ((w - 1) / timelineColumns) * 100;
}

function adsFloatingMilestoneCaretClass(caretOnTop: boolean): string {
  if (caretOnTop) {
    return "before:pointer-events-none before:absolute before:left-3 before:bottom-full before:z-10 before:border-x-[7px] before:border-b-[10px] before:border-x-transparent before:[border-bottom-color:var(--milestone-caret,#801ED7)] before:content-['']";
  }
  return "after:pointer-events-none after:absolute after:left-3 after:top-full after:z-10 after:border-x-[7px] after:border-t-[10px] after:border-x-transparent after:[border-top-color:var(--milestone-caret,#801ED7)] after:content-['']";
}

/** Top of Go-live (random) pill — clears upward caret above pill plus gap below anchor bar. */
function adsGoliveRandomBelowBarTopPx(anchor: TileWithLane): number {
  const barBottom =
    ADS_CHEVRON_TOP_OFFSET_PX +
    anchor.lane * (ADS_CHEVRON_TILE_HEIGHT_PX + TILE_LANE_GAP) +
    ADS_CHEVRON_TILE_HEIGHT_PX;
  return barBottom + ADS_GOLIVE_RANDOM_CLEARANCE_BELOW_ANCHOR_PX;
}

function attachLeftInterlockAdsTile(
  tile: TileWithLane,
  siblings: TileWithLane[],
  planOptionId: PlanOptionId,
  durationWeeks: number,
): boolean {
  const u = getTileTimelineUnits(planOptionId, tile, durationWeeks);
  let bestPrevEnd = -Infinity;
  for (const o of siblings) {
    if (o.lane !== tile.lane) continue;
    const ou = getTileTimelineUnits(planOptionId, o, durationWeeks);
    if (ou.endUnit < u.startUnit && ou.endUnit > bestPrevEnd) {
      bestPrevEnd = ou.endUnit;
    }
  }
  return Number.isFinite(bestPrevEnd) && bestPrevEnd === u.startUnit - 1;
}

/** Immediate predecessor on the same lane that shares an interlock seam with `tile`, if any. */
function adsPrevInterlockedSibling(
  tile: TileWithLane,
  siblings: TileWithLane[],
  planOptionId: PlanOptionId,
  durationWeeks: number,
): TileWithLane | null {
  const u = getTileTimelineUnits(planOptionId, tile, durationWeeks);
  let bestPrevEnd = -Infinity;
  let prev: TileWithLane | null = null;
  for (const o of siblings) {
    if (o.lane !== tile.lane) continue;
    const ou = getTileTimelineUnits(planOptionId, o, durationWeeks);
    if (ou.endUnit < u.startUnit && ou.endUnit > bestPrevEnd) {
      bestPrevEnd = ou.endUnit;
      prev = o;
    }
  }
  return Number.isFinite(bestPrevEnd) && bestPrevEnd === u.startUnit - 1 ? prev : null;
}

/** Same n at shared seams: min of effective notch depths among this tile and same-lane neighbors. */
function adsLaneNotchPxForTile(
  tile: TileWithLane,
  siblings: TileWithLane[],
  planOptionId: PlanOptionId,
  durationWeeks: number,
  timelineColumns: number,
  railW: number,
): number {
  const u = getTileTimelineUnits(planOptionId, tile, durationWeeks);
  const spanSelf = u.endUnit - u.startUnit + 1;
  const wSelf = (spanSelf / timelineColumns) * railW;
  let n = adsEffectiveLaneNotchPx(wSelf);

  for (const o of siblings) {
    if (o.lane !== tile.lane) continue;
    const ou = getTileTimelineUnits(planOptionId, o, durationWeeks);
    const adjacent = ou.endUnit === u.startUnit - 1 || u.endUnit === ou.startUnit - 1;
    if (!adjacent) continue;
    const spanO = ou.endUnit - ou.startUnit + 1;
    const wO = (spanO / timelineColumns) * railW;
    n = Math.min(n, adsEffectiveLaneNotchPx(wO));
  }

  return Math.max(ADS_LANE_NOTCH_MIN_PX, n);
}

function isAdsLaneWorkstream(ws: string): ws is (typeof ADS_CANVAS_LANE_IDS)[number] {
  return (ADS_CANVAS_LANE_IDS as readonly string[]).includes(ws);
}

/**
 * AI Decisioning swimlane **key milestones** (star + label + caret): one violet for every lane so
 * lane `one` matches the rest (it previously used `#300266`, which reads navy on white next to brighter lane hues).
 * Chevrons still use {@link adsChevronSurfaceClass} / lane styling — milestones only.
 */
const ADS_AI_SWIMLANE_MILESTONE_ACCENT = "#801ED7";

function adsChevronSurfaceClass(category: TileRecord["Category"]) {
  if (category === "onboarding_session") {
    return "bg-[#300266] text-white";
  }
  return "bg-[#C9C4EF] text-[#300266]";
}

function scaleWeekSpansToColumnSpans(weekSpans: number[], columnTotal: number): number[] {
  const sum = weekSpans.reduce((a, b) => a + b, 0);
  const scaled = weekSpans.map((s) => (s / sum) * columnTotal);
  const floors = scaled.map((x) => Math.floor(x));
  let remainder = columnTotal - floors.reduce((a, b) => a + b, 0);
  const frac = scaled.map((x, i) => x - floors[i]!);
  const order = frac
    .map((f, i) => ({ f, i }))
    .sort((a, b) => b.f - a.f);
  const result = [...floors];
  for (let k = 0; k < remainder; k++) {
    result[order[k]!.i] += 1;
  }
  return result;
}

function igniteGoldColumnToWeek(column: number, durationWeeks: number): number {
  return Math.min(Math.max(column, 1), durationWeeks);
}

function assignRowLanesByWeek(
  rowTiles: TileRecord[],
  columnIndexes: number[],
  planOptionId: PlanOptionId,
  durationWeeks: number,
): TileWithLane[] {
  const units = (tile: TileRecord) => getTileTimelineUnits(planOptionId, tile, durationWeeks);

  const hasWeeklyAlignment = rowTiles.some((tile) => tile.Tile_ID === "weekly_alignment");
  const laneEndUnits: number[] = hasWeeklyAlignment ? [0] : [];
  const output: TileWithLane[] = [];

  for (const columnIndex of columnIndexes) {
    const startTiles = rowTiles
      .filter((tile) => units(tile).startUnit === columnIndex)
      .sort((a, b) => {
        const aIsWeekly = a.Tile_ID === "weekly_alignment";
        const bIsWeekly = b.Tile_ID === "weekly_alignment";
        if (aIsWeekly !== bIsWeekly) return aIsWeekly ? -1 : 1;
        if (a.Stack_Order !== b.Stack_Order) return a.Stack_Order - b.Stack_Order;
        if (a.Span_Weeks !== b.Span_Weeks) return b.Span_Weeks - a.Span_Weeks;
        return tileStableKey(a).localeCompare(tileStableKey(b));
      });

    for (const tile of startTiles) {
      const tileEndUnit = units(tile).endUnit;
      if (tile.Tile_ID === "weekly_alignment") {
        laneEndUnits[0] = tileEndUnit;
        output.push({ ...tile, lane: 0 });
        continue;
      }

      const laneSearchStart = hasWeeklyAlignment ? 1 : 0;
      let lane = -1;
      for (let i = laneSearchStart; i < laneEndUnits.length; i += 1) {
        if (units(tile).startUnit > laneEndUnits[i]!) {
          lane = i;
          break;
        }
      }
      if (lane === -1) {
        lane = laneEndUnits.length;
        laneEndUnits.push(tileEndUnit);
      } else {
        laneEndUnits[lane] = tileEndUnit;
      }
      output.push({ ...tile, lane });
    }
  }

  return output;
}

function tileClass(category: TileRecord["Category"]) {
  if (category === "milestone") return "border-0 bg-transparent p-0";
  if (category === "onboarding_session") return "bg-[#300266] text-white border-[#300266]";
  return "bg-[#C9C4EF] text-[#300266] border-[#801ED7]";
}

/** Swimlane milestones use onboarding-session purple; Gantt milestones use workstream color in {@link BrazeCoreGanttChart}. */
const BRAZE_CORE_SWIMLANE_MILESTONE_ACCENT = "#300266";

function DraggableTile({
  tile,
  readOnly,
  style,
  onOpen,
}: {
  tile: TileRecord;
  readOnly: boolean;
  style: CSSProperties;
  onOpen: (tile: TileRecord) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tileStableKey(tile),
    disabled: readOnly,
  });

  return (
    <button
      ref={setNodeRef}
      onClick={() => onOpen(tile)}
      className={clsx(
        "absolute flex h-10 items-center justify-center overflow-hidden rounded-md px-1.5 py-1 text-center text-[12px] leading-tight shadow-sm",
        tile.Category === "milestone"
          ? "z-[18] border-2 border-white bg-white shadow-sm"
          : clsx("border", tileClass(tile.Category)),
        !readOnly && tile.Category !== "milestone" && "cursor-grab active:cursor-grabbing",
        isDragging && "z-20 opacity-80",
      )}
      style={{
        ...style,
        transform: CSS.Translate.toString(transform),
      }}
      {...listeners}
      {...attributes}
    >
      {tile.Category === "milestone" ? (
        <span
          className="inline-flex items-center justify-center gap-1.5"
          style={{ color: BRAZE_CORE_SWIMLANE_MILESTONE_ACCENT }}
        >
          <Star
            fill={BRAZE_CORE_SWIMLANE_MILESTONE_ACCENT}
            color={BRAZE_CORE_SWIMLANE_MILESTONE_ACCENT}
            stroke={BRAZE_CORE_SWIMLANE_MILESTONE_ACCENT}
            size={18}
            aria-hidden
          />
          <span
            className="font-semibold"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {tile.Title}
          </span>
        </span>
      ) : (
        <span className="inline-flex max-w-full items-center gap-1">
          {!readOnly && <GripVertical size={12} className="opacity-70" />}
          <span
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {tile.Title}
          </span>
        </span>
      )}
    </button>
  );
}

function StaticTile({
  tile,
  style,
  onOpen,
}: {
  tile: TileRecord;
  style: CSSProperties;
  onOpen: (tile: TileRecord) => void;
}) {
  return (
    <button
      onClick={() => onOpen(tile)}
      className={clsx(
        "absolute flex h-10 items-center justify-center overflow-hidden rounded-md px-1.5 py-1 text-center text-[12px] leading-tight shadow-sm",
        tile.Category === "milestone"
          ? "z-[18] border-2 border-white bg-white shadow-sm"
          : clsx("border", tileClass(tile.Category)),
      )}
      style={style}
    >
      {tile.Category === "milestone" ? (
        <span
          className="inline-flex items-center justify-center gap-1.5"
          style={{ color: BRAZE_CORE_SWIMLANE_MILESTONE_ACCENT }}
        >
          <Star
            fill={BRAZE_CORE_SWIMLANE_MILESTONE_ACCENT}
            color={BRAZE_CORE_SWIMLANE_MILESTONE_ACCENT}
            stroke={BRAZE_CORE_SWIMLANE_MILESTONE_ACCENT}
            size={18}
            aria-hidden
          />
          <span
            className="font-semibold"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
            }}
          >
            {tile.Title}
          </span>
        </span>
      ) : (
        <span
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
          }}
        >
          {tile.Title}
        </span>
      )}
    </button>
  );
}

function DraggableAdsChevronTile({
  tile,
  displayTitle,
  readOnly,
  style,
  clipPath,
  onOpen,
  fillParent = false,
}: {
  tile: TileRecord;
  /** Channel-aware label for ADS tiles; defaults to {@link TileRecord.Title}. */
  displayTitle: string;
  readOnly: boolean;
  style: CSSProperties;
  clipPath: string;
  onOpen: (tile: TileRecord) => void;
  /** When true, tile fills a positioned wrapper (resize handle sits on the wrapper). */
  fillParent?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tileStableKey(tile),
    disabled: readOnly,
  });

  const drag = CSS.Translate.toString(transform);

  return (
    <button
      ref={setNodeRef}
      type="button"
      title="Interlocking timeline bar — drag to reposition week"
      onClick={() => onOpen(tile)}
      className={clsx(
        "absolute flex items-center justify-center overflow-visible px-2 py-1",
        fillParent && "left-0 top-0 h-full w-full",
        adsChevronSurfaceClass(tile.Category),
        !readOnly && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-95",
      )}
      style={{
        height: fillParent ? "100%" : ADS_CHEVRON_TILE_HEIGHT_PX,
        ...style,
        clipPath,
        WebkitClipPath: clipPath,
        filter: ADS_CHEVRON_EDGE_FILTER,
        transform: drag || undefined,
        ...(isDragging ? { zIndex: 40 } : {}),
      }}
      {...listeners}
      {...attributes}
    >
      <span className="inline-flex w-[90%] max-w-[90%] items-center justify-center gap-1.5">
        {!readOnly && <GripVertical size={18} className="shrink-0 opacity-70" aria-hidden />}
        <span
          className="min-w-0 flex-1 text-center text-[20px] font-medium leading-snug"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 3,
            overflow: "hidden",
          }}
        >
          {displayTitle}
        </span>
      </span>
    </button>
  );
}

function StaticAdsChevronTile({
  tile,
  displayTitle,
  style,
  clipPath,
  onOpen,
}: {
  tile: TileRecord;
  displayTitle: string;
  style: CSSProperties;
  clipPath: string;
  onOpen: (tile: TileRecord) => void;
}) {
  return (
    <button
      type="button"
      title="Interlocking timeline bar"
      onClick={() => onOpen(tile)}
      className={clsx(
        "absolute flex items-center justify-center overflow-visible px-2 py-1",
        adsChevronSurfaceClass(tile.Category),
      )}
      style={{
        height: ADS_CHEVRON_TILE_HEIGHT_PX,
        ...style,
        clipPath,
        WebkitClipPath: clipPath,
        filter: ADS_CHEVRON_EDGE_FILTER,
      }}
    >
      <span
        className="w-[90%] max-w-[90%] text-center text-[20px] font-medium leading-snug"
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
          overflow: "hidden",
        }}
      >
        {displayTitle}
      </span>
    </button>
  );
}

function DraggableAdsMilestoneTile({
  tile,
  readOnly,
  style,
  onOpen,
  accentColor,
  caretOnTop = false,
}: {
  tile: TileRecord;
  readOnly: boolean;
  style: CSSProperties;
  onOpen: (tile: TileRecord) => void;
  accentColor: string;
  caretOnTop?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tileStableKey(tile),
    disabled: readOnly,
  });

  const drag = CSS.Translate.toString(transform);

  return (
    <button
      ref={setNodeRef}
      type="button"
      title="Key milestone — drag to reposition week"
      onClick={() => onOpen(tile)}
      className={clsx(
        "absolute z-[45] flex max-w-[min(240px,46vw)] items-start gap-2 rounded-lg border-2 border-white bg-white px-3 py-2 text-left text-[17px] font-semibold leading-snug shadow-lg outline-none",
        adsFloatingMilestoneCaretClass(caretOnTop),
        !readOnly && "cursor-grab active:cursor-grabbing",
        isDragging && "z-[55] opacity-95",
      )}
      style={{
        ...style,
        transform: drag || undefined,
        color: accentColor,
        ["--milestone-caret" as string]: accentColor,
      }}
      {...listeners}
      {...attributes}
    >
      <Star
        size={21}
        className="mt-0.5 shrink-0"
        style={{ color: accentColor }}
        fill={accentColor}
        stroke={accentColor}
        aria-hidden
      />
      <span
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
          overflow: "hidden",
          color: accentColor,
        }}
      >
        {tile.Title}
      </span>
    </button>
  );
}

function StaticAdsMilestoneTile({
  tile,
  style,
  onOpen,
  accentColor,
  caretOnTop = false,
}: {
  tile: TileRecord;
  style: CSSProperties;
  onOpen: (tile: TileRecord) => void;
  accentColor: string;
  caretOnTop?: boolean;
}) {
  return (
    <button
      type="button"
      title="Key milestone"
      onClick={() => onOpen(tile)}
      className={clsx(
        "absolute z-[45] flex max-w-[min(240px,46vw)] items-start gap-2 rounded-lg border-2 border-white bg-white px-3 py-2 text-left text-[17px] font-semibold leading-snug shadow-lg outline-none",
        adsFloatingMilestoneCaretClass(caretOnTop),
      )}
      style={{
        ...style,
        ["--milestone-caret" as string]: accentColor,
        color: accentColor,
      }}
    >
      <Star
        size={21}
        className="mt-0.5 shrink-0"
        style={{ color: accentColor }}
        fill={accentColor}
        stroke={accentColor}
        aria-hidden
      />
      <span
        style={{
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
          overflow: "hidden",
        }}
      >
        {tile.Title}
      </span>
    </button>
  );
}

function WorkstreamDropRow({
  workstream,
  children,
  minHeight,
}: {
  workstream: Workstream;
  children: ReactNode;
  minHeight: number;
}) {
  const { setNodeRef } = useDroppable({ id: `row:${workstream}` });
  return <div ref={setNodeRef} className="relative" style={{ minHeight }}>{children}</div>;
}

const ADS_CUSTOMER_ROLES_CHART_ROWS: {
  name: string;
  title: string;
  bullets: string[];
  commitmentDuring: string;
  commitmentAfter: string;
  mergeCommitmentColumns?: boolean;
}[] = [
  {
    name: "Clara",
    title: "The Use Case Champion",
    bullets: [
      "Provides overall oversight and strategic direction",
      "Clears risks and blockers",
      "Co-leads exec readouts (partnering with Decisioning Studio team)",
    ],
    commitmentDuring: "10% of full time employee (FTE)",
    commitmentAfter: "",
    mergeCommitmentColumns: true,
  },
  {
    name: "Peter",
    title: "The Project Coordinator",
    bullets: [
      "Project manages customer deliverables (working closely with Decisioning Studio team)",
      "Escalates risks and blockers to use case champion",
    ],
    commitmentDuring: "25% of full time employee (FTE)",
    commitmentAfter: "",
    mergeCommitmentColumns: true,
  },
  {
    name: "Mina",
    title: "The Marketer",
    bullets: [
      "Provides input on key decisions (audience, target metric, etc.)",
      "Oversees design of marketing creative and option banks",
      "Leads customer testing activities (e.g., QA copy and CTA links)",
    ],
    commitmentDuring: "50% of FTE",
    commitmentAfter: "10% of FTE",
  },
  {
    name: "Andrew",
    title: "The Activation Platform SME",
    bullets: [
      "Sets up automated, daily process for activating Decisioning Studio's recommendations",
      "Provides ongoing monitoring and troubleshooting support",
    ],
    commitmentDuring: "50% of FTE",
    commitmentAfter: "10% of FTE",
  },
  {
    name: "David",
    title: "The Data Engineer",
    bullets: ["Supports data discovery", "Implements automated daily pipeline to share data"],
    commitmentDuring: "50% of FTE",
    commitmentAfter: "10% of FTE",
  },
  {
    name: "Anna",
    title: "The Analyst",
    bullets: ["Validates Decisioning Studio's performance reporting against customer data"],
    commitmentDuring: "50% of FTE",
    commitmentAfter: "10% of FTE",
  },
];

/** Chart arrows: one SVG style (2px stroke + triangle marker) for horizontal and diagonal rows. */
function AdsCustomerRolesArrow({
  direction,
}: {
  direction: "right" | "down-right" | "up-right";
}) {
  const tipId = useId().replace(/:/g, "");
  const markerRef = `ads-croles-tip-${tipId}`;

  const line =
    direction === "right"
      ? { x1: 2, y1: 11, x2: 46, y2: 11 }
      : direction === "down-right"
        ? { x1: 2, y1: 4, x2: 44, y2: 17 }
        : { x1: 2, y1: 17, x2: 44, y2: 4 };

  return (
    <svg
      viewBox="0 0 56 22"
      className="h-[22px] w-14 shrink-0 text-[#801ED7]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <marker
          id={markerRef}
          markerUnits="userSpaceOnUse"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
        </marker>
      </defs>
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        markerEnd={`url(#${markerRef})`}
      />
    </svg>
  );
}

function adsCustomerRolesFootnoteArrow(rowIndex: number): ReactNode {
  if (rowIndex === 0) {
    return <AdsCustomerRolesArrow direction="down-right" />;
  }
  if (rowIndex === 1) {
    return <AdsCustomerRolesArrow direction="right" />;
  }
  if (rowIndex === 2) {
    return <AdsCustomerRolesArrow direction="up-right" />;
  }
  return null;
}

/** Customer Roles table uses `border-separate` so the arrow column can omit horizontal rules only. */
const ADS_ROLES_EDGE = "border-[#E8E5F8]";
const ADS_ROLES_TH_1 = `border-l border-r border-t border-b ${ADS_ROLES_EDGE} bg-[#faf8ff]`;
const ADS_ROLES_TH_MID = `border-r border-t border-b ${ADS_ROLES_EDGE} border-l-0 bg-[#faf8ff]`;
const ADS_ROLES_TH_LAST = `border-0 bg-white`;
const ADS_ROLES_TD_1 = `border-l border-r border-b ${ADS_ROLES_EDGE} border-t-0 bg-white`;
const ADS_ROLES_TD_MID = `border-r border-b ${ADS_ROLES_EDGE} border-l-0 border-t-0 bg-white`;
const ADS_ROLES_TD_LAST = `border-0 bg-white`;

function AdsCustomerRolesChart() {
  const footnote = (
    <p className="text-base italic leading-snug text-[#4c3b78]">
      <span className="font-semibold not-italic text-[#801ED7]">*</span> Depending on the
      organization, these roles are often run by 1 individual
    </p>
  );

  return (
    <div>
      <h3 className="text-center text-[28px] font-semibold leading-tight text-[#2c1650]">
        Customer Roles and Responsibilities
      </h3>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[min(100%,780px)] table-fixed border-separate border-spacing-0 text-left text-base text-[#2F2354]">
            <colgroup>
              <col style={{ width: "18%" }} />
              <col />
              <col style={{ width: "11rem" }} />
              <col style={{ width: "11rem" }} />
            </colgroup>
            <thead>
              <tr className="align-top">
                <th
                  className={`${ADS_ROLES_TH_1} px-3 py-3.5 text-[18px] font-semibold text-[#2c1650] sm:px-4`}
                >
                  Role Persona*
                </th>
                <th
                  className={`${ADS_ROLES_TH_MID} px-3 py-3.5 text-[18px] font-semibold text-[#2c1650] sm:px-4`}
                >
                  Responsibilities During Setup
                </th>
                <th
                  className={`${ADS_ROLES_TH_MID} px-3 py-3.5 text-[17px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
                >
                  Commitment During Implementation
                </th>
                <th
                  className={`${ADS_ROLES_TH_MID} px-3 py-3.5 text-[17px] font-semibold leading-tight text-[#2c1650] sm:px-4`}
                >
                  Commitment After Launch
                </th>
                <th
                  className={`${ADS_ROLES_TH_LAST} hidden w-14 py-3.5 pl-0 pr-0 text-center lg:table-cell`}
                  aria-hidden
                />
              </tr>
            </thead>
            <tbody>
              {ADS_CUSTOMER_ROLES_CHART_ROWS.map((row, rowIndex) => (
                <tr key={row.name} className="align-top">
                  <td className={`${ADS_ROLES_TD_1} px-3 py-3.5 sm:px-4`}>
                    <span className="font-semibold text-[#300266]">{row.name}</span>
                    <span className="mt-0.5 block text-[17px] font-normal text-[#5c4a7a]">
                      {row.title}
                    </span>
                  </td>
                  <td className={`${ADS_ROLES_TD_MID} px-3 py-3.5 sm:px-4`}>
                    <ul className="space-y-1.5">
                      {row.bullets.map((line) => (
                        <li key={line} className="flex gap-2 leading-relaxed">
                          <span
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#801ED7]"
                            aria-hidden
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  {row.mergeCommitmentColumns ? (
                    <td
                      colSpan={2}
                      className={`${ADS_ROLES_TD_MID} px-3 py-3.5 align-top text-[17px] leading-snug text-[#2F2354] sm:px-4`}
                    >
                      <span className="block min-w-0 break-words">{row.commitmentDuring}</span>
                    </td>
                  ) : (
                    <>
                      <td
                        className={`${ADS_ROLES_TD_MID} px-3 py-3.5 align-top text-[17px] leading-snug text-[#2F2354] sm:px-4`}
                      >
                        <span className="block min-w-0 break-words">{row.commitmentDuring}</span>
                      </td>
                      <td
                        className={`${ADS_ROLES_TD_MID} px-3 py-3.5 align-top text-[17px] leading-snug text-[#2F2354] sm:px-4`}
                      >
                        <span className="block min-w-0 break-words">{row.commitmentAfter}</span>
                      </td>
                    </>
                  )}
                  <td
                    className={`${ADS_ROLES_TD_LAST} hidden align-middle lg:table-cell lg:w-14 lg:p-0`}
                  >
                    <div className="flex min-h-[2.875rem] items-center justify-end py-1 pl-0 pr-0 lg:justify-end">
                      {adsCustomerRolesFootnoteArrow(rowIndex)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ArrowBigDown
          className="mx-auto h-8 w-8 shrink-0 text-[#801ED7] lg:hidden"
          strokeWidth={1.25}
          aria-hidden
        />
        <aside className="w-full shrink-0 rounded-lg border border-[#d7ccf6] bg-[#f6efff] p-[18px] lg:max-w-[280px] lg:self-center lg:-translate-y-20">
          {footnote}
        </aside>
      </div>
    </div>
  );
}

export function CanvasBoard({ config, tiles = [], readOnly = false }: Props) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedTile, setSelectedTile] = useState<TileRecord | null>(null);
  const [editsByUid, setEditsByUid] = useState<LayoutEditsMap>({});
  const layoutUndoStackRef = useRef<LayoutEditsMap[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** In-memory tile notes (key = {@link tileStableKey}); survives closing the drawer until Okay or Save layout. */
  const [pendingNotesByUid, setPendingNotesByUid] = useState<Record<string, string>>({});
  const [pendingTitleByUid, setPendingTitleByUid] = useState<Record<string, string>>({});
  const [pendingDescriptionByUid, setPendingDescriptionByUid] = useState<Record<string, string>>({});
  /** In-app navigation target when user follows a link with unsaved layout changes. */
  const [leaveIntentHref, setLeaveIntentHref] = useState<string | null>(null);
  const [notesOkayPending, setNotesOkayPending] = useState(false);
  const [deleteTilePending, setDeleteTilePending] = useState(false);
  const [deleteConfirmTile, setDeleteConfirmTile] = useState<TileRecord | null>(null);
  const [addTilePanelOpen, setAddTilePanelOpen] = useState(false);
  const [addTileSaving, setAddTileSaving] = useState(false);
  /** Braze Core only: switch swimlane timeline vs Gantt (placeholder until Gantt is implemented). */
  const [brazeCoreView, setBrazeCoreView] = useState<"swimlane" | "gantt">("swimlane");
  /** Gantt-only filter: default unchecked so the first Gantt view shows customer activities/milestones. */
  const [showOnboardingSessionsInGantt, setShowOnboardingSessionsInGantt] = useState(false);
  /** AI Decisioning Studio: swimlane vs Gantt (Gantt defaults to customer activities only until checkbox). */
  const [adsCanvasView, setAdsCanvasView] = useState<"swimlane" | "gantt">("swimlane");
  const [showAdsOnboardingSessionsInGantt, setShowAdsOnboardingSessionsInGantt] = useState(false);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  /** Measured rail width for drag math only — must NOT drive React state (ResizeObserver + heavy ADS tiles froze the tab). */
  const timelineWidthRef = useRef(1200);
  const isAiDecisioningStudio = config.Product_Type === "AI Decisioning Studio";
  const showBrazeViewToggle = !isAiDecisioningStudio;
  const showSaveToolbar = !readOnly;
  const isEnterprisePlatinum = config.planOptionId === "12_week";
  const durationWeeks = isAiDecisioningStudio
    ? AI_DECISIONING_STUDIO_TIMELINE_WEEKS
    : isEnterprisePlatinum
      ? ENTERPRISE_PLATINUM_TIMELINE_COLUMNS
      : config.Duration_Weeks || 12;
  const isGrowthSilver = config.planOptionId === "growth_silver";
  const isIgniteGold = config.planOptionId === "ignite_gold";
  const isIgniteSilverWide = config.planOptionId === "ignite_silver";
  const isQuickstartGold = config.planOptionId === "quickstart_gold";
  const isQuickstartSilverWide = config.planOptionId === "quickstart_silver";
  const timelineConfig = useMemo(() => getTimelineConfig(config.planOptionId), [config.planOptionId]);
  const timelineColumns = useMemo(() => {
    if (isAiDecisioningStudio) return AI_DECISIONING_STUDIO_TIMELINE_WEEKS;
    if (isGrowthSilver) return durationWeeks * GROWTH_SILVER_COLUMNS_PER_WEEK;
    if (isIgniteSilverWide) return IGNITE_SILVER_TIMELINE_COLUMNS;
    if (isIgniteGold) return timelineConfig.months.length * IGNITE_GOLD_COLUMNS_PER_MONTH;
    if (isQuickstartGold || isQuickstartSilverWide) return QUICKSTART_GOLD_TIMELINE_COLUMNS;
    return durationWeeks;
  }, [
    isAiDecisioningStudio,
    isGrowthSilver,
    isIgniteGold,
    isIgniteSilverWide,
    isQuickstartGold,
    isQuickstartSilverWide,
    durationWeeks,
    timelineConfig.months.length,
  ]);
  const timelineColumnIndexes = useMemo(
    () => Array.from({ length: timelineColumns }, (_, index) => index + 1),
    [timelineColumns],
  );
  const showMonthsRow = timelineConfig.months.length > 0;
  const showWeeksRow = isGrowthSilver;

  const phaseGridSpans = useMemo(() => {
    if (!isIgniteGold && !isIgniteSilverWide && !isQuickstartGold && !isQuickstartSilverWide)
      return timelineConfig.phases.map((p) => p.span);
    return scaleWeekSpansToColumnSpans(
      timelineConfig.phases.map((p) => p.span),
      timelineColumns,
    );
  }, [
    isIgniteGold,
    isIgniteSilverWide,
    isQuickstartGold,
    isQuickstartSilverWide,
    timelineConfig.phases,
    timelineColumns,
  ]);

  const monthGridSpans = useMemo(() => {
    if (!isIgniteGold && !isIgniteSilverWide && !isQuickstartGold && !isQuickstartSilverWide)
      return timelineConfig.months.map((m) => m.span);
    if (isQuickstartGold || isQuickstartSilverWide) {
      return timelineConfig.months.map(() => QUICKSTART_GOLD_COLUMNS_PER_MONTH);
    }
    if (isIgniteSilverWide) {
      return timelineConfig.months.map(() => IGNITE_SILVER_COLUMNS_PER_MONTH);
    }
    return timelineConfig.months.map(() => IGNITE_GOLD_COLUMNS_PER_MONTH);
  }, [
    isIgniteGold,
    isIgniteSilverWide,
    isQuickstartGold,
    isQuickstartSilverWide,
    timelineConfig.months,
  ]);

  const timelineGridBackground = useMemo((): CSSProperties => {
    if (isAiDecisioningStudio) {
      return {
        backgroundImage:
          "linear-gradient(to right, #E8E5F8 1px, transparent 1px), linear-gradient(to bottom, #F8F6FD 1px, transparent 1px)",
        backgroundSize: `${100 / AI_DECISIONING_STUDIO_TIMELINE_WEEKS}% 100%, 100% 30px`,
      };
    }
    if (isGrowthSilver) {
      return {
        backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent calc(100% / ${durationWeeks} - 1px), #E8E5F8 calc(100% / ${durationWeeks} - 1px), #E8E5F8 calc(100% / ${durationWeeks})), linear-gradient(to bottom, #F8F6FD 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 100% 30px",
      };
    }
    if (
      isIgniteGold ||
      isIgniteSilverWide ||
      isQuickstartGold ||
      isQuickstartSilverWide ||
      isEnterprisePlatinum
    ) {
      const bands = timelineConfig.months.length;
      return {
        backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent calc(100% / ${bands} - 1px), #E8E5F8 calc(100% / ${bands} - 1px), #E8E5F8 calc(100% / ${bands})), linear-gradient(to bottom, #F8F6FD 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 100% 30px",
      };
    }
    return {
      backgroundImage:
        "linear-gradient(to right, #E8E5F8 1px, transparent 1px), linear-gradient(to bottom, #F8F6FD 1px, transparent 1px)",
      backgroundSize: `${100 / timelineColumns}% 100%, 100% 30px`,
    };
  }, [
    isAiDecisioningStudio,
    isGrowthSilver,
    isIgniteGold,
    isIgniteSilverWide,
    isQuickstartGold,
    isQuickstartSilverWide,
    isEnterprisePlatinum,
    durationWeeks,
    timelineColumns,
    timelineConfig.months.length,
  ]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const campaignWorkstreamSwatch =
    WORKSTREAMS.find((w) => w.id === "campaign")?.color ?? "#91186E";
  const renderReadOnly = readOnly || !isHydrated;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    layoutUndoStackRef.current = [];
  }, [config.Config_ID]);

  useEffect(() => {
    if (readOnly) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== "z") return;
      if (e.shiftKey) return;
      if (layoutUndoStackRef.current.length === 0) return;
      e.preventDefault();
      const prev = layoutUndoStackRef.current.pop()!;
      setEditsByUid(prev);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readOnly]);

  useEffect(() => {
    const element = timelineRef.current;
    if (!element) return;

    let raf = 0;
    const measure = () => {
      const w = Math.round(element.getBoundingClientRect().width);
      if (!Number.isFinite(w) || w <= 0) return;
      if (timelineWidthRef.current === w) return;
      timelineWidthRef.current = w;
    };

    measure();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [brazeCoreView, adsCanvasView]);

  const serverNotesByUid = useMemo(
    () => new Map(tiles.map((t) => [tileStableKey(t), t.Notes ?? ""])),
    [tiles],
  );

  const serverTitleByUid = useMemo(
    () => new Map(tiles.map((t) => [tileStableKey(t), t.Title])),
    [tiles],
  );

  const serverDescriptionByUid = useMemo(
    () => new Map(tiles.map((t) => [tileStableKey(t), t.Description ?? ""])),
    [tiles],
  );

  const tileState = useMemo(
    () =>
      tiles.map((tile) => {
        const k = tileStableKey(tile);
        let out: TileRecord = { ...tile };
        const edit = editsByUid[k];
        if (edit) out = { ...out, ...edit };
        if (Object.prototype.hasOwnProperty.call(pendingTitleByUid, k)) {
          out = { ...out, Title: pendingTitleByUid[k]! };
        }
        if (Object.prototype.hasOwnProperty.call(pendingDescriptionByUid, k)) {
          out = { ...out, Description: pendingDescriptionByUid[k]! };
        }
        return out;
      }),
    [tiles, editsByUid, pendingTitleByUid, pendingDescriptionByUid],
  );

  const drawerTile = useMemo(() => {
    if (!selectedTile) return null;
    const k = tileStableKey(selectedTile);
    return tileState.find((t) => tileStableKey(t) === k) ?? selectedTile;
  }, [selectedTile, tileState]);

  const drawerNotesValue = useMemo(() => {
    if (!drawerTile) return "";
    const k = tileStableKey(drawerTile);
    if (Object.prototype.hasOwnProperty.call(pendingNotesByUid, k)) {
      return pendingNotesByUid[k]!;
    }
    return drawerTile.Notes ?? "";
  }, [drawerTile, pendingNotesByUid]);

  const drawerContentDirty = useMemo(() => {
    if (readOnly || !drawerTile) return false;
    const k = tileStableKey(drawerTile);
    const st = tiles.find((t) => tileStableKey(t) === k);
    if (!st) return false;
    const notesVal = Object.prototype.hasOwnProperty.call(pendingNotesByUid, k)
      ? pendingNotesByUid[k]!
      : (drawerTile.Notes ?? "");
    if (notesVal !== (serverNotesByUid.get(k) ?? "")) return true;
    if (drawerTile.Title !== st.Title) return true;
    if ((drawerTile.Description ?? "") !== (st.Description ?? "")) return true;
    return false;
  }, [
    readOnly,
    drawerTile,
    tiles,
    pendingNotesByUid,
    serverNotesByUid,
  ]);

  const showDrawerDeleteButton = useMemo(
    () =>
      !readOnly &&
      !!drawerTile &&
      (isAiDecisioningStudio
        ? drawerTile.Tile_ID.startsWith("custom_")
        : config.Product_Type === "Braze Core"),
    [readOnly, drawerTile, isAiDecisioningStudio, config.Product_Type],
  );

  const visibleTileState = useMemo(
    () =>
      tileState.filter((tile) =>
        isWorkstreamVisibleForChannels(tile.Workstream, config.channels),
      ),
    [tileState, config.channels],
  );

  /** Email-scoped rows (DNS/SSL, IT Manager) only when channel is on AND email tiles exist — matches hidden email swimlane when API omits Channel_* or seeds skipped email. */
  const hasEmailWorkstreamTiles = useMemo(
    () => visibleTileState.some((t) => t.Workstream === "email"),
    [visibleTileState],
  );

  const brazeCoreResourceLinks = useMemo(
    () =>
      config.Product_Type === "Braze Core"
        ? getBrazeCoreResourceDrawerLinks(
            config.planOptionId,
            config.channels.email && hasEmailWorkstreamTiles,
          )
        : undefined,
    [
      config.Product_Type,
      config.planOptionId,
      config.channels.email,
      hasEmailWorkstreamTiles,
    ],
  );

  const newSwimlaneTileDefaultSpan = isGrowthSilver ? 2 : 4;
  const handleCreateSwimlaneTile = useCallback(
    async (payload: {
      title: string;
      description: string;
      attendees: string;
      resources: string;
      desiredOutcomes: string;
      category: TileCategory;
    }) => {
      const slug = `custom_${Date.now().toString(36)}`;
      const defaultTargetWorkstream: Workstream = isAiDecisioningStudio
        ? ADS_CANVAS_LANE_IDS[0]
        : (WORKSTREAMS.find((ws) => isWorkstreamVisibleForChannels(ws.id, config.channels))?.id ??
          "governance");
      const wsTiles = visibleTileState.filter((t) => t.Workstream === defaultTargetWorkstream);
      const stackOrder = (wsTiles.length ? Math.max(...wsTiles.map((t) => t.Stack_Order)) : 0) + 1;
      const span = newSwimlaneTileDefaultSpan;
      const startWeek = Math.max(1, durationWeeks - span + 1);
      setAddTileSaving(true);
      setSaveError(null);
      try {
        const res = await fetch("/api/tiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            configId: config.Config_ID,
            tile: {
              Tile_ID: slug,
              Workstream: defaultTargetWorkstream,
              Title: payload.title,
              Description: payload.description,
              Attendees: payload.attendees,
              Resources: payload.resources,
              Desired_Outcomes: payload.desiredOutcomes,
              Category: payload.category,
              Start_Week: startWeek,
              Span_Weeks: span,
              Stack_Order: stackOrder,
              Notes: "",
            },
          }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          setSaveError(err.error ?? "Unable to create tile.");
          return false;
        }
        router.refresh();
        setSelectedTile(null);
        return true;
      } finally {
        setAddTileSaving(false);
      }
    },
    [
      visibleTileState,
      config.Config_ID,
      config.channels,
      durationWeeks,
      newSwimlaneTileDefaultSpan,
      isAiDecisioningStudio,
      router,
    ],
  );

  const tilesByWorkstream = useMemo(() => {
    return WORKSTREAMS.reduce(
      (acc, workstream) => {
        acc[workstream.id] = visibleTileState.filter((tile) => tile.Workstream === workstream.id);
        return acc;
      },
      {} as Record<Workstream, TileRecord[]>,
    );
  }, [visibleTileState]);

  const adsTilesByLane = useMemo(() => {
    const empty: Record<(typeof ADS_CANVAS_LANE_IDS)[number], TileRecord[]> = {
      one: [],
      two: [],
      three: [],
      four: [],
    };
    if (!isAiDecisioningStudio) return empty;
    for (const tile of visibleTileState) {
      if (tile.Category === "milestone") continue;
      const laneWs = tile.Workstream;
      if (isAdsLaneWorkstream(laneWs)) {
        empty[laneWs].push(tile);
      }
    }
    return empty;
  }, [isAiDecisioningStudio, visibleTileState]);

  const visibleWorkstreams = useMemo(
    () =>
      WORKSTREAMS.filter((ws) => {
        if (!isWorkstreamVisibleForChannels(ws.id, config.channels)) return false;
        return (tilesByWorkstream[ws.id]?.length ?? 0) > 0;
      }),
    [config.channels, tilesByWorkstream],
  );

  const originalLayoutByUid = useMemo(
    () =>
      new Map(
        tiles.map((tile) => [
          tileStableKey(tile),
          {
            Start_Week: tile.Start_Week,
            Workstream: tile.Workstream,
            Span_Weeks: tile.Span_Weeks,
          },
        ]),
      ),
    [tiles],
  );

  /** Template span from last server fetch; used for Braze Core resize minimum rules until refresh. */
  const serverTemplateSpanByUid = useMemo(
    () => new Map(tiles.map((t) => [tileStableKey(t), t.Span_Weeks])),
    [tiles],
  );

  const adsGanttSpanResize = useMemo((): BrazeCoreGanttSpanResizeProps | undefined => {
    if (!isAiDecisioningStudio || readOnly) return undefined;
    return {
      planOptionId: config.planOptionId,
      durationWeeks,
      timelineColumns,
      getTimelineWidthPx: () => timelineWidthRef.current,
      templateSpanWeeksForTile: (t: TileRecord) =>
        t.Tile_ID.startsWith("custom_")
          ? 1
          : (serverTemplateSpanByUid.get(tileStableKey(t)) ?? t.Span_Weeks),
      onSpanChange: (t: TileRecord, span: number) => {
        const uid = tileStableKey(t);
        if (t.Span_Weeks === span) return;
        setEditsByUid((c) => {
          pushLayoutUndoSnapshot(layoutUndoStackRef, c);
          return {
            ...c,
            [uid]: { ...c[uid], Span_Weeks: span },
          };
        });
      },
      spanResizeMode: "aiAdsChevron",
      spanResizeHandleHeightPx: 32,
    };
  }, [
    isAiDecisioningStudio,
    readOnly,
    config.planOptionId,
    durationWeeks,
    timelineColumns,
    serverTemplateSpanByUid,
  ]);

  const brazeCoreGanttSpanResize = useMemo((): BrazeCoreGanttSpanResizeProps | undefined => {
    if (isAiDecisioningStudio || readOnly) return undefined;
    return {
      planOptionId: config.planOptionId,
      durationWeeks,
      timelineColumns,
      getTimelineWidthPx: () => timelineWidthRef.current,
      templateSpanWeeksForTile: (t: TileRecord) =>
        t.Tile_ID.startsWith("custom_")
          ? 1
          : (serverTemplateSpanByUid.get(tileStableKey(t)) ?? t.Span_Weeks),
      onSpanChange: (t: TileRecord, span: number) => {
        const uid = tileStableKey(t);
        if (t.Span_Weeks === span) return;
        setEditsByUid((c) => {
          pushLayoutUndoSnapshot(layoutUndoStackRef, c);
          return {
            ...c,
            [uid]: { ...c[uid], Span_Weeks: span },
          };
        });
      },
    };
  }, [
    isAiDecisioningStudio,
    readOnly,
    config.planOptionId,
    durationWeeks,
    timelineColumns,
    serverTemplateSpanByUid,
  ]);

  const changedTiles = useMemo(
    () =>
      tileState.filter((tile) => {
        if (!isWorkstreamVisibleForChannels(tile.Workstream, config.channels)) return false;
        const original = originalLayoutByUid.get(tileStableKey(tile));
        if (!original) return false;
        return (
          original.Start_Week !== tile.Start_Week ||
          original.Workstream !== tile.Workstream ||
          original.Span_Weeks !== tile.Span_Weeks
        );
      }),
    [tileState, originalLayoutByUid, config.channels],
  );

  const copyDirtyKeys = useMemo(() => {
    const set = new Set<string>();
    for (const t of tiles) {
      const k = tileStableKey(t);
      if (!isWorkstreamVisibleForChannels(t.Workstream, config.channels)) continue;
      const eff = tileState.find((x) => tileStableKey(x) === k);
      if (!eff) continue;
      if (eff.Title !== (serverTitleByUid.get(k) ?? "")) set.add(k);
      if ((eff.Description ?? "") !== (serverDescriptionByUid.get(k) ?? "")) set.add(k);
    }
    return set;
  }, [tiles, tileState, config.channels, serverTitleByUid, serverDescriptionByUid]);

  const savePatchKeys = useMemo(() => {
    const positionKeys = new Set(changedTiles.map(tileStableKey));
    const noteDirtyKeys = new Set(
      Object.entries(pendingNotesByUid)
        .filter(([k, v]) => v !== (serverNotesByUid.get(k) ?? ""))
        .map(([k]) => k),
    );
    return new Set([...positionKeys, ...noteDirtyKeys, ...copyDirtyKeys]);
  }, [changedTiles, pendingNotesByUid, serverNotesByUid, copyDirtyKeys]);

  const unsavedRef = useRef(false);
  useEffect(() => {
    unsavedRef.current = savePatchKeys.size > 0 && !readOnly;
  }, [savePatchKeys.size, readOnly]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!unsavedRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (!unsavedRef.current) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const el = (e.target as HTMLElement | null)?.closest("a[href]");
      if (!el) return;
      const a = el as HTMLAnchorElement;
      if (a.getAttribute("download") != null) return;
      if (a.target === "_blank") return;
      const hrefAttr = a.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;
      let nextUrl: URL;
      try {
        nextUrl = new URL(hrefAttr, window.location.href);
      } catch {
        return;
      }
      if (nextUrl.origin !== window.location.origin) return;
      const here = new URL(window.location.href);
      if (nextUrl.pathname === here.pathname && nextUrl.search === here.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveIntentHref(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    if (readOnly) return;
    const activeUid = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    const activeTile = tileState.find((tile) => tileStableKey(tile) === activeUid);
    if (!activeTile) return;
    if (!isWorkstreamVisibleForChannels(activeTile.Workstream, config.channels)) return;

    const weekWidthPx = Math.max(60, timelineWidthRef.current / timelineColumns);
    const movedByUnits = Math.round(event.delta.x / weekWidthPx);
    const u = getTileTimelineUnits(config.planOptionId, activeTile, durationWeeks);
    const spanUnits = u.endUnit - u.startUnit + 1;
    const maxStartUnit = Math.max(1, timelineColumns - spanUnits + 1);
    const nextStartUnit = Math.min(maxStartUnit, Math.max(1, u.startUnit + movedByUnits));
    const nextStartWeek =
      config.planOptionId === "ignite_gold"
        ? igniteGoldColumnToWeek(nextStartUnit, durationWeeks)
        : config.planOptionId === "ignite_silver"
          ? igniteGoldColumnToWeek(
              nextStartUnit,
              Math.min(durationWeeks, IGNITE_SILVER_TIMELINE_COLUMNS),
            )
        : config.planOptionId === "quickstart_gold" ||
            config.planOptionId === "quickstart_silver"
          ? igniteGoldColumnToWeek(
              nextStartUnit,
              Math.min(durationWeeks, QUICKSTART_GOLD_TIMELINE_COLUMNS),
            )
          : nextStartUnit;

    let nextWorkstream: Workstream = activeTile.Workstream;
    if (isAiDecisioningStudio) {
      const rowKey = overId?.startsWith("row:") ? overId.slice("row:".length) : "";
      if (activeTile.Category === "milestone") {
        if (rowKey && isAdsLaneWorkstream(rowKey)) {
          nextWorkstream = rowKey;
        }
      } else if (rowKey && isAdsLaneWorkstream(rowKey)) {
        nextWorkstream = rowKey;
      }
    } else {
      nextWorkstream = overId?.startsWith("row:")
        ? (overId.replace("row:", "") as Workstream)
        : activeTile.Workstream;
    }
    if (!isWorkstreamVisibleForChannels(nextWorkstream, config.channels)) return;

    if (
      activeTile.Start_Week === nextStartWeek &&
      activeTile.Workstream === nextWorkstream
    ) {
      return;
    }

    setEditsByUid((current) => {
      pushLayoutUndoSnapshot(layoutUndoStackRef, current);
      return {
        ...current,
        [activeUid]: {
          ...current[activeUid],
          Start_Week: nextStartWeek,
          Workstream: nextWorkstream,
        },
      };
    });
  }

  const handleDrawerNotesChange = useCallback(
    (value: string) => {
      if (readOnly || !selectedTile) return;
      const k = tileStableKey(selectedTile);
      setPendingNotesByUid((prev) => ({ ...prev, [k]: value }));
    },
    [readOnly, selectedTile],
  );

  const handleDrawerTitleCommit = useCallback(
    (title: string) => {
      if (readOnly || !selectedTile) return;
      const k = tileStableKey(selectedTile);
      const trimmed = title.trim();
      const serverT = tiles.find((t) => tileStableKey(t) === k)?.Title ?? "";
      setPendingTitleByUid((prev) => {
        if (trimmed === serverT) {
          if (!Object.prototype.hasOwnProperty.call(prev, k)) return prev;
          const next = { ...prev };
          delete next[k];
          return next;
        }
        return { ...prev, [k]: trimmed };
      });
    },
    [readOnly, selectedTile, tiles],
  );

  const handleDrawerDescriptionCommit = useCallback(
    (description: string) => {
      if (readOnly || !selectedTile) return;
      const k = tileStableKey(selectedTile);
      const serverD = tiles.find((t) => tileStableKey(t) === k)?.Description ?? "";
      setPendingDescriptionByUid((prev) => {
        if (description === serverD) {
          if (!Object.prototype.hasOwnProperty.call(prev, k)) return prev;
          const next = { ...prev };
          delete next[k];
          return next;
        }
        return { ...prev, [k]: description };
      });
    },
    [readOnly, selectedTile, tiles],
  );

  const handleNotesOkay = useCallback(async (): Promise<boolean> => {
    if (readOnly || !drawerTile) return false;
    if (!drawerContentDirty) return false;
    const k = tileStableKey(drawerTile);
    const notes = Object.prototype.hasOwnProperty.call(pendingNotesByUid, k)
      ? pendingNotesByUid[k]!
      : (drawerTile.Notes ?? "");

    setNotesOkayPending(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/tiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId: config.Config_ID,
          updates: [
            {
              Tile_ID: drawerTile.Tile_ID,
              Start_Week: drawerTile.Start_Week,
              Workstream: drawerTile.Workstream,
              Notes: notes,
              Title: drawerTile.Title,
              Description: drawerTile.Description ?? "",
            },
          ],
        }),
      });
      if (response.ok) {
        setPendingNotesByUid((prev) => {
          const next = { ...prev };
          delete next[k];
          return next;
        });
        setPendingTitleByUid((prev) => {
          const next = { ...prev };
          delete next[k];
          return next;
        });
        setPendingDescriptionByUid((prev) => {
          const next = { ...prev };
          delete next[k];
          return next;
        });
        router.refresh();
        setSelectedTile(null);
        return true;
      }
      const payload = (await response.json()) as { error?: string };
      setSaveError(payload.error ?? "Unable to save notes.");
      return false;
    } finally {
      setNotesOkayPending(false);
    }
  }, [readOnly, drawerTile, drawerContentDirty, pendingNotesByUid, config.Config_ID, router]);

  const performDeleteTile = useCallback(
    async (target: TileRecord): Promise<boolean> => {
      const rowId = target.CaboodlePatchKey?.trim() || `${config.Config_ID}__${target.Tile_ID}`;
      setDeleteTilePending(true);
      setSaveError(null);
      try {
        const qs = new URLSearchParams({ configId: config.Config_ID, id: rowId });
        const response = await fetch(`/api/tiles?${qs.toString()}`, { method: "DELETE" });
        if (response.ok) {
          const k = tileStableKey(target);
          setPendingNotesByUid((prev) => {
            const next = { ...prev };
            delete next[k];
            return next;
          });
          setPendingTitleByUid((prev) => {
            const next = { ...prev };
            delete next[k];
            return next;
          });
          setPendingDescriptionByUid((prev) => {
            const next = { ...prev };
            delete next[k];
            return next;
          });
          setEditsByUid((prev) => {
            const next = { ...prev };
            delete next[k];
            return next;
          });
          setSelectedTile(null);
          setDeleteConfirmTile(null);
          router.refresh();
          return true;
        }
        const payload = (await response.json()) as { error?: string };
        setSaveError(payload.error ?? "Unable to delete tile.");
        return false;
      } finally {
        setDeleteTilePending(false);
      }
    },
    [config.Config_ID, router],
  );

  const handleConfirmDeleteTile = useCallback(async () => {
    if (readOnly || !deleteConfirmTile) return;
    await performDeleteTile(deleteConfirmTile);
  }, [readOnly, deleteConfirmTile, performDeleteTile]);

  const openDeleteTileConfirm = useCallback(() => {
    if (!drawerTile || readOnly) return;
    setDeleteConfirmTile(drawerTile);
  }, [drawerTile, readOnly]);

  async function saveLayout(): Promise<boolean> {
    if (savePatchKeys.size === 0) return true;

    const updates: Array<{
      Tile_ID: string;
      Start_Week: number;
      Workstream: Workstream;
      Span_Weeks?: number;
      Notes: string;
      Title: string;
      Description: string;
    }> = [];
    for (const key of savePatchKeys) {
      const tile = tileState.find((t) => tileStableKey(t) === key);
      if (!tile) continue;
      if (!isWorkstreamVisibleForChannels(tile.Workstream, config.channels)) continue;
      updates.push({
        Tile_ID: tile.Tile_ID,
        Start_Week: tile.Start_Week,
        Workstream: tile.Workstream,
        Span_Weeks: tile.Span_Weeks,
        Notes: Object.prototype.hasOwnProperty.call(pendingNotesByUid, key)
          ? pendingNotesByUid[key]!
          : (tile.Notes ?? ""),
        Title: tile.Title,
        Description: tile.Description ?? "",
      });
    }
    if (!updates.length) return true;

    setSaving(true);
    setSaveError(null);

    const response = await fetch("/api/tiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        configId: config.Config_ID,
        updates,
      }),
    });

    setSaving(false);
    if (response.ok) {
      layoutUndoStackRef.current = [];
      setPendingNotesByUid((prev) => {
        const next = { ...prev };
        for (const key of savePatchKeys) {
          delete next[key];
        }
        return next;
      });
      setPendingTitleByUid((prev) => {
        const next = { ...prev };
        for (const key of savePatchKeys) {
          delete next[key];
        }
        return next;
      });
      setPendingDescriptionByUid((prev) => {
        const next = { ...prev };
        for (const key of savePatchKeys) {
          delete next[key];
        }
        return next;
      });
      router.refresh();
      return true;
    }
    const payload = (await response.json()) as { error?: string };
    setSaveError(payload.error ?? "Unable to save layout.");
    return false;
  }

  const coreRowContent = visibleWorkstreams.map((workstream) => {
    const rowTiles = tilesByWorkstream[workstream.id];
    const rowTilesWithLanes = assignRowLanesByWeek(
      rowTiles,
      timelineColumnIndexes,
      config.planOptionId,
      durationWeeks,
    );
    const laneCount = Math.max(
      1,
      rowTilesWithLanes.reduce((maxLane, tile) => Math.max(maxLane, tile.lane + 1), 0),
    );
    const rowHeight = Math.max(
      92,
      TILE_TOP_OFFSET * 2 + laneCount * TILE_HEIGHT_PX + (laneCount - 1) * TILE_LANE_GAP,
    );

    return (
      <div
        key={workstream.id}
        className="grid grid-cols-[220px_1fr] border-b border-[#E8E5F8]"
      >
        <div
          className="flex items-center justify-center border-r border-[#E8E5F8] px-3 py-3 text-center"
          style={{ backgroundColor: workstream.color, minHeight: rowHeight }}
        >
          <span className="w-full max-w-[160px] text-sm font-semibold leading-tight text-white drop-shadow-sm">
            {workstream.label}
          </span>
        </div>
        <div className="relative" style={timelineGridBackground}>
          <WorkstreamDropRow workstream={workstream.id} minHeight={rowHeight}>
            {rowTilesWithLanes.map((tile) => {
              const tu = getTileTimelineUnits(config.planOptionId, tile, durationWeeks);
              const spanUnits = tu.endUnit - tu.startUnit + 1;
              const frameStyle: CSSProperties = {
                top: TILE_TOP_OFFSET + tile.lane * (TILE_HEIGHT_PX + TILE_LANE_GAP),
                left: `${((tu.startUnit - 1) / timelineColumns) * 100}%`,
                width: `${(spanUnits / timelineColumns) * 100}%`,
                height: TILE_HEIGHT_PX,
              };
              const innerStyle: CSSProperties = {
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
              };
              const uid = tileStableKey(tile);

              return renderReadOnly ? (
                <StaticTile
                  key={uid}
                  tile={tile}
                  onOpen={setSelectedTile}
                  style={frameStyle}
                />
              ) : (
                <div key={uid} className="absolute" style={frameStyle}>
                  <DraggableTile
                    tile={tile}
                    readOnly={readOnly}
                    onOpen={setSelectedTile}
                    style={innerStyle}
                  />
                  {!readOnly &&
                    !isAiDecisioningStudio &&
                    tile.Category !== "milestone" && (
                    <BrazeCoreSpanResizeHandle
                      tile={tile}
                      planOptionId={config.planOptionId}
                      durationWeeks={durationWeeks}
                      timelineColumns={timelineColumns}
                      templateSpanWeeks={
                        tile.Tile_ID.startsWith("custom_")
                          ? 1
                          : (serverTemplateSpanByUid.get(uid) ?? tile.Span_Weeks)
                      }
                      getTimelineWidthPx={() => timelineWidthRef.current}
                      onSpanChange={(nextSpan) => {
                        const t = tileState.find((x) => tileStableKey(x) === uid);
                        if (t && t.Span_Weeks === nextSpan) return;
                        setEditsByUid((c) => {
                          pushLayoutUndoSnapshot(layoutUndoStackRef, c);
                          return {
                            ...c,
                            [uid]: { ...c[uid], Span_Weeks: nextSpan },
                          };
                        });
                      }}
                      heightClass="h-10"
                    />
                  )}
                </div>
              );
            })}
          </WorkstreamDropRow>
        </div>
      </div>
    );
  });

  const adsMsLaneStridePx =
    ADS_MILESTONE_CARD_STACK_PX + ADS_MILESTONE_BOTTOM_GAP_PX;

  const adsWeekHeaderRow = (
    <div className="border-b border-[#E8E5F8] bg-[#faf8ff]">
      <div
        ref={timelineRef}
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${AI_DECISIONING_STUDIO_TIMELINE_WEEKS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: AI_DECISIONING_STUDIO_TIMELINE_WEEKS }, (_, index) => (
          <div
            key={index + 1}
            className="border-l border-[#E8E5F8] px-2 py-3 text-center text-[16px] font-semibold text-[#6B5A9A]"
          >
            W{index + 1}
          </div>
        ))}
      </div>
    </div>
  );

  const adsLaneRows = ADS_CANVAS_LANE_IDS.map((laneId) => {
    const rowTiles = adsTilesByLane[laneId];
    const rowTilesWithLanes = assignRowLanesByWeek(
      rowTiles,
      timelineColumnIndexes,
      config.planOptionId,
      durationWeeks,
    );

    const laneMilestones = visibleTileState.filter(
      (t) => t.Category === "milestone" && t.Workstream === laneId,
    );

    const postGoliveAnchor = rowTilesWithLanes.find(
      (t) => t.Tile_ID === ADS_POST_GOLIVE_BAR_TILE_ID,
    );
    const goliveRandomTile = laneMilestones.find((t) => t.Tile_ID === "ads_ms_golive_random");
    const useBelowBarGoliveRandom =
      goliveRandomTile != null && laneId === "two" && postGoliveAnchor != null;

    const laneMilestonesTopBand = laneMilestones.filter(
      (t) => !(useBelowBarGoliveRandom && t.Tile_ID === "ads_ms_golive_random"),
    );

    const laneMilestoneLanes = assignRowLanesByWeek(
      laneMilestonesTopBand,
      timelineColumnIndexes,
      config.planOptionId,
      durationWeeks,
    );

    let milestoneBandHeight = 0;
    const hasGoliveTrainedTop = laneMilestoneLanes.some(
      (t) => t.Tile_ID === "ads_ms_golive_trained",
    );
    if (laneMilestoneLanes.length > 0) {
      const laneMsLaneCount = laneMilestoneLanes.reduce(
        (maxLane, tile) => Math.max(maxLane, tile.lane + 1),
        0,
      );
      const goliveCount = laneMilestoneLanes.filter(isAdsGoliveMilestone).length;
      const goliveExtra = goliveCount > 1 ? (goliveCount - 1) * adsMsLaneStridePx : 0;
      milestoneBandHeight = Math.max(
        76,
        ADS_MILESTONE_CARET_OVERFLOW_PX +
          ADS_MILESTONE_BAND_BOTTOM_PADDING_PX +
          laneMsLaneCount * adsMsLaneStridePx +
          goliveExtra +
          (hasGoliveTrainedTop ? ADS_MS_GOLIVE_EDGE_GUTTER_PX : 0),
      );
    }

    const laneCount = Math.max(
      1,
      rowTilesWithLanes.reduce((maxLane, tile) => Math.max(maxLane, tile.lane + 1), 0),
    );
    let chevronAreaHeight = Math.max(
      ADS_CHEVRON_TOP_OFFSET_PX * 2 +
        laneCount * ADS_CHEVRON_TILE_HEIGHT_PX +
        (laneCount - 1) * TILE_LANE_GAP,
      ADS_CHEVRON_TILE_HEIGHT_PX + ADS_CHEVRON_TOP_OFFSET_PX * 2,
    );

    const goliveRandomTopPx =
      useBelowBarGoliveRandom && postGoliveAnchor
        ? adsGoliveRandomBelowBarTopPx(postGoliveAnchor)
        : null;
    if (goliveRandomTopPx != null) {
      chevronAreaHeight = Math.max(
        chevronAreaHeight,
        goliveRandomTopPx +
          ADS_MS_GOLIVE_RANDOM_BODY_PX +
          ADS_MS_GOLIVE_EDGE_GUTTER_PX,
      );
    }

    const totalRowHeight = milestoneBandHeight + chevronAreaHeight;

    return (
      <div key={laneId} className="border-b border-[#E8E5F8]">
        <div className="relative w-full" style={timelineGridBackground}>
          <WorkstreamDropRow workstream={laneId} minHeight={totalRowHeight}>
            <div className="relative w-full" style={{ minHeight: totalRowHeight }}>
              {milestoneBandHeight > 0 ? (
                <div
                  className="relative w-full overflow-visible"
                  style={{ height: milestoneBandHeight }}
                >
                  {(() => {
                    let goliveOrder = 0;
                    return laneMilestoneLanes.map((tile) => {
                      const anchorLeftPct = adsMilestoneWeekLeftPct(tile, timelineColumns);
                      const isGolive = isAdsGoliveMilestone(tile);
                      const goliveStackPx = isGolive
                        ? goliveOrder++ * adsMsLaneStridePx
                        : 0;
                      const bottomPx =
                        ADS_MILESTONE_BAND_BOTTOM_PADDING_PX +
                        ADS_MILESTONE_CARET_OVERFLOW_PX +
                        tile.lane * adsMsLaneStridePx +
                        goliveStackPx +
                        (tile.Tile_ID === "ads_ms_golive_trained"
                          ? ADS_MS_GOLIVE_EDGE_GUTTER_PX
                          : 0);
                      const style: CSSProperties = {
                        bottom: bottomPx,
                        left: `${anchorLeftPct}%`,
                        top: "auto",
                      };
                      return renderReadOnly ? (
                        <StaticAdsMilestoneTile
                          key={tileStableKey(tile)}
                          tile={tile}
                          accentColor={ADS_AI_SWIMLANE_MILESTONE_ACCENT}
                          onOpen={setSelectedTile}
                          style={style}
                        />
                      ) : (
                        <DraggableAdsMilestoneTile
                          key={tileStableKey(tile)}
                          tile={tile}
                          readOnly={readOnly}
                          accentColor={ADS_AI_SWIMLANE_MILESTONE_ACCENT}
                          onOpen={setSelectedTile}
                          style={style}
                        />
                      );
                    });
                  })()}
                </div>
              ) : null}
              <div
                className="relative w-full overflow-visible"
                style={{
                  height: chevronAreaHeight,
                  minHeight: chevronAreaHeight,
                }}
              >
                {rowTilesWithLanes.map((tile, chevronStackIndex) => {
                  const attachLeft = attachLeftInterlockAdsTile(
                    tile,
                    rowTilesWithLanes,
                    config.planOptionId,
                    durationWeeks,
                  );
                  const tu = getTileTimelineUnits(config.planOptionId, tile, durationWeeks);
                  const spanUnits = tu.endUnit - tu.startUnit + 1;
                  const leftPct = ((tu.startUnit - 1) / timelineColumns) * 100;
                  const widthPct = (spanUnits / timelineColumns) * 100;
                  const railW = Math.max(1, timelineWidthRef.current);
                  const n = adsLaneNotchPxForTile(
                    tile,
                    rowTilesWithLanes,
                    config.planOptionId,
                    durationWeeks,
                    timelineColumns,
                    railW,
                  );
                  const clipPath = adsInterlockingClipPath(attachLeft, n);
                  const prevSibling = adsPrevInterlockedSibling(
                    tile,
                    rowTilesWithLanes,
                    config.planOptionId,
                    durationWeeks,
                  );
                  const sameCategoryInterlock =
                    attachLeft &&
                    prevSibling != null &&
                    prevSibling.Category === tile.Category;
                  /** Slightly less horizontal overlap so the joint gap follows the arrows (clip-path still uses full `n`). */
                  const overlapPx =
                    attachLeft && sameCategoryInterlock
                      ? Math.max(ADS_LANE_NOTCH_MIN_PX, n - ADS_CHEVRON_SAME_FILL_GAP_PX)
                      : attachLeft
                        ? n
                        : 0;
                  const style: CSSProperties = {
                    top:
                      ADS_CHEVRON_TOP_OFFSET_PX +
                      tile.lane * (ADS_CHEVRON_TILE_HEIGHT_PX + TILE_LANE_GAP),
                    left: attachLeft ? `calc(${leftPct}% - ${overlapPx}px)` : `${leftPct}%`,
                    width: attachLeft ? `calc(${widthPct}% + ${overlapPx}px)` : `${widthPct}%`,
                    zIndex: chevronStackIndex + 1,
                  };
                  const chevronLabel = adsChevronDisplayTitle(tile, config.channels);
                  const chevronUid = tileStableKey(tile);
                  const chevronFrameStyle: CSSProperties = {
                    ...style,
                    height: ADS_CHEVRON_TILE_HEIGHT_PX,
                  };
                  return renderReadOnly ? (
                    <StaticAdsChevronTile
                      key={chevronUid}
                      tile={tile}
                      displayTitle={chevronLabel}
                      clipPath={clipPath}
                      onOpen={setSelectedTile}
                      style={style}
                    />
                  ) : (
                    <div key={chevronUid} className="absolute overflow-visible" style={chevronFrameStyle}>
                      <DraggableAdsChevronTile
                        tile={tile}
                        displayTitle={chevronLabel}
                        readOnly={readOnly}
                        clipPath={clipPath}
                        fillParent
                        onOpen={setSelectedTile}
                        style={{}}
                      />
                      {tile.Category !== "milestone" ? (
                        <BrazeCoreSpanResizeHandle
                          tile={tile}
                          planOptionId={config.planOptionId}
                          durationWeeks={durationWeeks}
                          timelineColumns={timelineColumns}
                          templateSpanWeeks={
                            serverTemplateSpanByUid.get(chevronUid) ?? tile.Span_Weeks
                          }
                          getTimelineWidthPx={() => timelineWidthRef.current}
                          onSpanChange={(nextSpan) => {
                            const t = tileState.find((x) => tileStableKey(x) === chevronUid);
                            if (t && t.Span_Weeks === nextSpan) return;
                            setEditsByUid((c) => {
                              pushLayoutUndoSnapshot(layoutUndoStackRef, c);
                              return {
                                ...c,
                                [chevronUid]: { ...c[chevronUid], Span_Weeks: nextSpan },
                              };
                            });
                          }}
                          heightClass="h-10"
                          handleHeightPx={ADS_CHEVRON_TILE_HEIGHT_PX}
                          mode="aiAdsChevron"
                        />
                      ) : null}
                    </div>
                  );
                })}
                {useBelowBarGoliveRandom && goliveRandomTile && goliveRandomTopPx != null ? (
                  renderReadOnly ? (
                    <StaticAdsMilestoneTile
                      key={tileStableKey(goliveRandomTile)}
                      tile={goliveRandomTile}
                      accentColor={ADS_AI_SWIMLANE_MILESTONE_ACCENT}
                      caretOnTop
                      onOpen={setSelectedTile}
                      style={{
                        top: goliveRandomTopPx,
                        left: `${adsMilestoneWeekLeftPct(goliveRandomTile, timelineColumns)}%`,
                      }}
                    />
                  ) : (
                    <DraggableAdsMilestoneTile
                      key={tileStableKey(goliveRandomTile)}
                      tile={goliveRandomTile}
                      readOnly={readOnly}
                      accentColor={ADS_AI_SWIMLANE_MILESTONE_ACCENT}
                      caretOnTop
                      onOpen={setSelectedTile}
                      style={{
                        top: goliveRandomTopPx,
                        left: `${adsMilestoneWeekLeftPct(goliveRandomTile, timelineColumns)}%`,
                      }}
                    />
                  )
                ) : null}
              </div>
            </div>
          </WorkstreamDropRow>
        </div>
      </div>
    );
  });

  const adsBoardBody = (
    <>
      {adsWeekHeaderRow}
      {adsLaneRows}
    </>
  );

  const showAddTileToolbarButton =
    !readOnly &&
    (isAiDecisioningStudio
      ? adsCanvasView === "swimlane"
      : brazeCoreView === "swimlane");

  const addTileSquareButton = (
    <button
      type="button"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#801ED7] text-white shadow-md transition hover:bg-[#6b18b8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#801ED7]"
      aria-label="Add tile"
      title="Add a new tile (appears on the first row at the right of the timeline)"
      onClick={() => setAddTilePanelOpen(true)}
    >
      <Plus size={22} strokeWidth={2.5} aria-hidden />
    </button>
  );

  return (
    <div className="relative">
      {(showSaveToolbar || showBrazeViewToggle || isAiDecisioningStudio) && (
        <div className="mb-3 flex min-h-[2.5rem] items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {isAiDecisioningStudio ? (
              <div className="flex flex-wrap items-center gap-3">
                {!readOnly && adsCanvasView === "swimlane" ? addTileSquareButton : null}
                <button
                  type="button"
                  onClick={() =>
                    setAdsCanvasView((v) => (v === "swimlane" ? "gantt" : "swimlane"))
                  }
                  className="shrink-0 rounded-md border border-[#801ED7] bg-white px-4 py-2 text-sm font-semibold text-[#801ED7] shadow-sm transition hover:bg-[#f6efff]"
                >
                  {adsCanvasView === "swimlane"
                    ? "View Gantt Chart"
                    : "View Swimlane Timeline"}
                </button>
                {adsCanvasView === "gantt" ? (
                  <label className="inline-flex select-none items-center gap-2 text-sm font-medium text-[#300266]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#c9c4ef] text-[#801ED7] focus:ring-[#801ED7]"
                      checked={showAdsOnboardingSessionsInGantt}
                      onChange={(e) => setShowAdsOnboardingSessionsInGantt(e.target.checked)}
                    />
                    Show onboarding sessions
                  </label>
                ) : null}
              </div>
            ) : showBrazeViewToggle ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setBrazeCoreView((v) => (v === "swimlane" ? "gantt" : "swimlane"))
                  }
                  className="shrink-0 rounded-md border border-[#801ED7] bg-white px-4 py-2 text-sm font-semibold text-[#801ED7] shadow-sm transition hover:bg-[#f6efff]"
                >
                  {brazeCoreView === "swimlane"
                    ? "View Gantt Chart"
                    : "View Swimlane Timeline"}
                </button>
                {showAddTileToolbarButton ? addTileSquareButton : null}
                {brazeCoreView === "gantt" ? (
                  <label className="inline-flex select-none items-center gap-2 text-sm font-medium text-[#300266]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#c9c4ef] text-[#801ED7] focus:ring-[#801ED7]"
                      checked={showOnboardingSessionsInGantt}
                      onChange={(e) => setShowOnboardingSessionsInGantt(e.target.checked)}
                    />
                    Show onboarding sessions
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
          {showSaveToolbar && (
            <div className="flex shrink-0 items-center justify-end">
              {savePatchKeys.size > 0 && (
                <span className="mr-3 text-xs font-semibold text-[#91186E]">
                  Unsaved changes: {savePatchKeys.size}
                </span>
              )}
              <button
                type="button"
                onClick={() => void saveLayout()}
                disabled={savePatchKeys.size === 0 || saving}
                className="cursor-pointer rounded-md bg-[#801ED7] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : `Save layout${savePatchKeys.size ? ` (${savePatchKeys.size})` : ""}`}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="rounded-xl border border-[#C9C4EF] bg-white shadow-sm">
        <div className="w-full">
          {isAiDecisioningStudio ? (
            adsCanvasView === "gantt" ? (
              <div className="px-2 py-4 sm:px-4">
                {renderReadOnly ? (
                  <BrazeCoreGanttChart
                    tiles={visibleTileState}
                    showOnboardingSessions={showAdsOnboardingSessionsInGantt}
                    planOptionId={config.planOptionId}
                    durationWeeks={durationWeeks}
                    timelineColumns={timelineColumns}
                    timelineConfig={timelineConfig}
                    showMonthsRow={showMonthsRow}
                    showWeeksRow={showWeeksRow}
                    phaseGridSpans={phaseGridSpans}
                    monthGridSpans={monthGridSpans}
                    onOpenTile={setSelectedTile}
                    readOnly
                    timelineRailRef={timelineRef}
                    laneLegend={AI_DECISIONING_GANTT_LANE_LEGEND}
                    matchAiDecisioningSwimlaneBars
                  />
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={adsCollisionDetection}
                    onDragEnd={handleDragEnd}
                  >
                    <BrazeCoreGanttChart
                      tiles={visibleTileState}
                      showOnboardingSessions={showAdsOnboardingSessionsInGantt}
                      planOptionId={config.planOptionId}
                      durationWeeks={durationWeeks}
                      timelineColumns={timelineColumns}
                      timelineConfig={timelineConfig}
                      showMonthsRow={showMonthsRow}
                      showWeeksRow={showWeeksRow}
                      phaseGridSpans={phaseGridSpans}
                      monthGridSpans={monthGridSpans}
                      onOpenTile={setSelectedTile}
                      readOnly={false}
                      timelineRailRef={timelineRef}
                      spanResize={adsGanttSpanResize}
                      laneLegend={AI_DECISIONING_GANTT_LANE_LEGEND}
                      matchAiDecisioningSwimlaneBars
                    />
                  </DndContext>
                )}
              </div>
            ) : renderReadOnly ? (
              adsBoardBody
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={adsCollisionDetection}
                onDragEnd={handleDragEnd}
              >
                {adsBoardBody}
              </DndContext>
            )
          ) : brazeCoreView === "gantt" ? (
            <div className="px-2 py-4 sm:px-4">
              {renderReadOnly ? (
                <BrazeCoreGanttChart
                  tiles={visibleTileState}
                  showOnboardingSessions={showOnboardingSessionsInGantt}
                  planOptionId={config.planOptionId}
                  durationWeeks={durationWeeks}
                  timelineColumns={timelineColumns}
                  timelineConfig={timelineConfig}
                  showMonthsRow={showMonthsRow}
                  showWeeksRow={showWeeksRow}
                  phaseGridSpans={phaseGridSpans}
                  monthGridSpans={monthGridSpans}
                  onOpenTile={setSelectedTile}
                  readOnly
                  timelineRailRef={timelineRef}
                />
              ) : (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <BrazeCoreGanttChart
                    tiles={visibleTileState}
                    showOnboardingSessions={showOnboardingSessionsInGantt}
                    planOptionId={config.planOptionId}
                    durationWeeks={durationWeeks}
                    timelineColumns={timelineColumns}
                    timelineConfig={timelineConfig}
                    showMonthsRow={showMonthsRow}
                    showWeeksRow={showWeeksRow}
                    phaseGridSpans={phaseGridSpans}
                    monthGridSpans={monthGridSpans}
                    onOpenTile={setSelectedTile}
                    readOnly={false}
                    timelineRailRef={timelineRef}
                    spanResize={brazeCoreGanttSpanResize}
                  />
                </DndContext>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[220px_1fr] border-b border-[#E8E5F8]">
                <div className="border-r border-[#E8E5F8] px-3 py-3 text-sm font-semibold text-[#300266]">
                  Phases
                </div>
                <div
                  ref={timelineRef}
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${timelineColumns}, minmax(0, 1fr))` }}
                >
                  {timelineConfig.phases.map((phase, i) => (
                    <div
                      key={`phase-${phase.name}`}
                      className="border-l border-[#E8E5F8] px-2 py-3 text-center text-xs font-semibold text-[#4C3B78]"
                      style={{ gridColumn: `span ${phaseGridSpans[i]!}` }}
                    >
                      {phase.name}
                    </div>
                  ))}
                </div>
              </div>
              {showMonthsRow && (
                <div className="grid grid-cols-[220px_1fr] border-b border-[#E8E5F8]">
                  <div className="border-r border-[#E8E5F8] px-3 py-3 text-sm font-semibold text-[#300266]">
                    Months
                  </div>
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${timelineColumns}, minmax(0, 1fr))` }}
                  >
                    {timelineConfig.months.map((month, i) => (
                      <div
                        key={`month-${month.name}`}
                        className="border-l border-[#E8E5F8] px-2 py-3 text-center text-xs font-semibold text-[#6B5A9A]"
                        style={{ gridColumn: `span ${monthGridSpans[i]!}` }}
                      >
                        {month.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showWeeksRow && (
                <div className="grid grid-cols-[220px_1fr] border-b border-[#E8E5F8]">
                  <div className="border-r border-[#E8E5F8] px-3 py-3 text-sm font-semibold text-[#300266]">
                    Weeks
                  </div>
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${timelineColumns}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: durationWeeks }, (_, index) => (
                      <div
                        key={index + 1}
                        className="border-l border-[#E8E5F8] px-3 py-3 text-center text-xs font-semibold text-[#6B5A9A]"
                        style={{ gridColumn: `span ${GROWTH_SILVER_COLUMNS_PER_WEEK}` }}
                      >
                        {`Week ${index + 1}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {renderReadOnly ? (
                coreRowContent
              ) : (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  {coreRowContent}
                </DndContext>
              )}
            </>
          )}
        </div>
      </div>
      {saveError && <p className="mt-2 text-sm text-[#cf3a50]">{saveError}</p>}
      {(isAiDecisioningStudio ? adsCanvasView !== "gantt" : brazeCoreView !== "gantt") && (
      <div
        className={clsx(
          "rounded-xl border border-[#E8E5F8] bg-white px-4 py-3 text-[#4c3b78]",
          isAiDecisioningStudio ? "mt-10 text-[19px] leading-snug" : "mt-3 text-sm",
        )}
      >
        {isAiDecisioningStudio ? (
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-[#2c1650]">
              AI Decisioning Studio Key
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="inline-flex items-center gap-2">
                <Star
                  size={30}
                  className="shrink-0"
                  fill={ADS_AI_SWIMLANE_MILESTONE_ACCENT}
                  color={ADS_AI_SWIMLANE_MILESTONE_ACCENT}
                  stroke={ADS_AI_SWIMLANE_MILESTONE_ACCENT}
                  aria-hidden
                />
                <span className="font-semibold text-[#801ED7]">Key Milestone</span>
              </span>
              <span className="inline-flex items-center gap-2">
  <span
    className="inline-block h-8 w-16 shrink-0 bg-[#300266]"
    style={{
      clipPath: adsInterlockingClipPath(true, adsEffectiveLaneNotchPx(64)),
      WebkitClipPath: adsInterlockingClipPath(true, adsEffectiveLaneNotchPx(64)),
      filter: ADS_CHEVRON_EDGE_FILTER,
    }}
    aria-hidden
  />
  <span>
    <span className="font-semibold text-[#300266]">
      Primarily BrazeAI Decisioning Studio™
    </span>
  </span>
</span>
<span className="inline-flex items-center gap-2">
  <span
    className="inline-block h-8 w-16 shrink-0 bg-[#C9C4EF]"
    style={{
      clipPath: adsInterlockingClipPath(true, adsEffectiveLaneNotchPx(64)),
      WebkitClipPath: adsInterlockingClipPath(true, adsEffectiveLaneNotchPx(64)),
      filter: ADS_CHEVRON_EDGE_FILTER,
    }}
    aria-hidden
  />
  <span>
    <span className="font-semibold text-[#300266]">
      Combination of BrazeAI Decisioning Studio™ and Customer
    </span>
  </span>
</span>
            </div>
          </div>
        ) : (
          <>
            <span className="mr-4 inline-flex items-center gap-2">
              <span className="inline-flex h-7 items-center gap-1 rounded-md border-2 border-white bg-white px-2 py-0.5 shadow-sm ring-1 ring-black/5">
                <Star
                  size={14}
                  fill={campaignWorkstreamSwatch}
                  color={campaignWorkstreamSwatch}
                  stroke={campaignWorkstreamSwatch}
                  aria-hidden
                />
              </span>
              Project Milestone
            </span>
            <span className="mr-4 inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border border-[#801ED7] bg-[#C9C4EF]" /> Customer
              Activity
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#300266]" /> Onboarding Session
            </span>
          </>
        )}
      </div>
      )}
      {isAiDecisioningStudio ? (
        <>
          <div className="mt-10 rounded-xl border border-[#E8E5F8] bg-white px-4 py-4 shadow-sm">
            <h2 className="mb-4 text-center text-[28px] font-semibold leading-tight text-[#2c1650]">
              Illustrative Results Timeline
            </h2>
            <div className="flex w-full justify-center overflow-hidden">
              {/* Reference artwork — served from /public/decisioning-studio.png */}
              <img
                src="/decisioning-studio.png"
                alt="AI Decisioning Studio implementation reference"
                className="h-auto max-h-[80vh] w-[72vw] max-w-full object-contain"
                decoding="async"
              />
            </div>
          </div>
          <div
            id="ads-customer-roles-chart"
            className="mt-10 scroll-mt-8 rounded-xl border border-[#E8E5F8] bg-white px-4 py-4 shadow-sm"
          >
            <AdsCustomerRolesChart />
          </div>
        </>
      ) : config.Product_Type === "Braze Core" ? (
        <div
          id="braze-core-resources-chart"
          className="mt-10 scroll-mt-8 rounded-xl border border-[#E8E5F8] bg-white px-4 py-4 shadow-sm"
        >
          <BrazeCoreResourcesChart
            planOptionId={config.planOptionId}
            channels={config.channels}
            hasEmailWorkstreamTiles={hasEmailWorkstreamTiles}
          />
        </div>
      ) : null}
      {leaveIntentHref ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="leave-guard-title">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-[2px]"
            aria-label="Dismiss"
            onClick={() => setLeaveIntentHref(null)}
          />
          <div className="relative z-[1] w-full max-w-md rounded-xl border border-[#C9C4EF] bg-white p-6 shadow-2xl">
            <p id="leave-guard-title" className="text-xs font-semibold uppercase tracking-wide text-[#6B5A9A]">
              Unsaved changes
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-snug text-[#1a102b]">
              Save before you leave?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#4c3b78]">
              You have unsaved updates to this plan. If you leave now, those changes will be lost unless you save
              first.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={() => setLeaveIntentHref(null)}
                className="order-3 rounded-lg border border-[#d7ccf6] bg-white px-4 py-2.5 text-sm font-semibold text-[#300266] shadow-sm transition hover:bg-[#f6efff] sm:order-1"
              >
                Stay on this page
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  const href = leaveIntentHref;
                  setLeaveIntentHref(null);
                  router.push(href);
                }}
                className="order-2 rounded-lg border border-[#91186E]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#91186E] shadow-sm transition hover:bg-[#fdf5f8] disabled:opacity-50"
              >
                Leave without saving
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void (async () => {
                    const href = leaveIntentHref;
                    const ok = await saveLayout();
                    if (ok && href) {
                      setLeaveIntentHref(null);
                      router.push(href);
                    }
                  })();
                }}
                className="order-1 rounded-lg bg-[#801ED7] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#6b18b8] disabled:cursor-not-allowed disabled:opacity-60 sm:order-3"
              >
                {saving ? "Saving…" : "Save and leave"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {deleteConfirmTile ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-tile-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-[2px]"
            aria-label="Dismiss"
            disabled={deleteTilePending}
            onClick={() => setDeleteConfirmTile(null)}
          />
          <div className="relative z-[1] w-full max-w-md rounded-xl border border-[#C9C4EF] bg-white p-6 shadow-2xl">
            <p
              id="delete-tile-dialog-title"
              className="text-xs font-semibold uppercase tracking-wide text-[#6B5A9A]"
            >
              Delete tile
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-snug text-[#1a102b]">Are you sure?</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#4c3b78]">
              Remove &quot;{deleteConfirmTile.Title}&quot; from this plan? This cannot be undone.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                disabled={deleteTilePending}
                onClick={() => setDeleteConfirmTile(null)}
                className="rounded-lg border border-[#d7ccf6] bg-white px-4 py-2.5 text-sm font-semibold text-[#300266] shadow-sm transition hover:bg-[#f6efff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteTilePending}
                onClick={() => void handleConfirmDeleteTile()}
                className="rounded-lg bg-[#cf3a50] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#b83248] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteTilePending ? "Deleting…" : "Delete tile"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <AddSwimlaneTilePanel
        open={addTilePanelOpen}
        onClose={() => setAddTilePanelOpen(false)}
        isSaving={addTileSaving}
        onSubmit={handleCreateSwimlaneTile}
      />
      <TileDrawer
        tile={drawerTile}
        config={config}
        onClose={() => setSelectedTile(null)}
        onNavigateToCustomerRolesChart={
          isAiDecisioningStudio
            ? () => {
                setSelectedTile(null);
                window.setTimeout(() => {
                  document
                    .getElementById("ads-customer-roles-chart")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 320);
              }
            : undefined
        }
        onNavigateToBrazeResourceRow={
          config.Product_Type === "Braze Core"
            ? (rowElementId) => {
                setSelectedTile(null);
                window.setTimeout(() => {
                  document.getElementById(rowElementId)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }, 320);
              }
            : undefined
        }
        brazeCoreResourceLinks={brazeCoreResourceLinks}
        notesValue={drawerNotesValue}
        onNotesChange={handleDrawerNotesChange}
        onNotesOkay={handleNotesOkay}
        notesOkayPending={notesOkayPending}
        readOnly={readOnly}
        notesEditorKey={drawerTile ? tileStableKey(drawerTile) : ""}
        drawerContentDirty={drawerContentDirty}
        onDrawerTitleCommit={handleDrawerTitleCommit}
        onDrawerDescriptionCommit={handleDrawerDescriptionCommit}
        showDeleteTile={showDrawerDeleteButton}
        onDeleteTilePress={openDeleteTileConfirm}
        deleteTilePending={deleteTilePending}
      />
    </div>
  );
}
