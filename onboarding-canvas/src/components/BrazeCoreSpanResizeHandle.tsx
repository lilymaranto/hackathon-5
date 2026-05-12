"use client";

import { clampAdsChevronSpanWeeks, clampBrazeCoreSpanWeeks } from "@/lib/braze-core-span-rules";
import type { PlanOptionId, TileRecord } from "@/lib/types";
import clsx from "clsx";
import { useCallback, useRef } from "react";

type Props = {
  tile: TileRecord;
  planOptionId: PlanOptionId;
  durationWeeks: number;
  timelineColumns: number;
  /** Server / template span used for minimum-duration rules. */
  templateSpanWeeks: number;
  getTimelineWidthPx: () => number;
  onSpanChange: (nextSpan: number) => void;
  /** Tailwind height class to match the tile bar (`h-10` swimlane, `h-8` gantt). */
  heightClass: "h-10" | "h-8";
  /** Braze Core swimlane/gantt vs AI Decisioning interlocking chevrons. */
  mode?: "braze" | "aiAdsChevron";
  /** When set (e.g. ADS chevron bar height in px), overrides `heightClass` for handle height. */
  handleHeightPx?: number;
};

/**
 * East-edge resize target: stays visually quiet until hover, then shows a light
 * rim/fill (same idea as the earlier visible handle) and grab cursors so the edge
 * is easy to find without changing the tile body.
 */
export function BrazeCoreSpanResizeHandle({
  tile,
  planOptionId,
  durationWeeks,
  timelineColumns,
  templateSpanWeeks,
  getTimelineWidthPx,
  onSpanChange,
  heightClass,
  mode = "braze",
  handleHeightPx,
}: Props) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const startSpanRef = useRef(tile.Span_Weeks);
  const startXRef = useRef(0);
  const lastSpanRef = useRef(tile.Span_Weeks);

  const applySpan = useCallback(
    (rawSpan: number) => {
      const next =
        mode === "aiAdsChevron"
          ? clampAdsChevronSpanWeeks({
              templateSpanWeeks,
              tile,
              durationWeeks,
              timelineColumns,
              requested: rawSpan,
            })
          : clampBrazeCoreSpanWeeks({
              templateSpanWeeks,
              planOptionId,
              tile,
              durationWeeks,
              timelineColumns,
              requested: rawSpan,
            });
      if (next === lastSpanRef.current) return;
      lastSpanRef.current = next;
      onSpanChange(next);
    },
    [durationWeeks, mode, planOptionId, templateSpanWeeks, tile, timelineColumns, onSpanChange],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const el = nodeRef.current;
      if (!el) return;

      startSpanRef.current = tile.Span_Weeks;
      lastSpanRef.current = tile.Span_Weeks;
      startXRef.current = e.clientX;
      el.setPointerCapture(e.pointerId);

      const weekW = Math.max(
        1,
        getTimelineWidthPx() / Math.max(1, timelineColumns),
      );

      const onMove = (ev: PointerEvent) => {
        const deltaWeeks = Math.round((ev.clientX - startXRef.current) / weekW);
        applySpan(startSpanRef.current + deltaWeeks);
      };

      const onUp = (ev: PointerEvent) => {
        if (el.hasPointerCapture(ev.pointerId)) {
          el.releasePointerCapture(ev.pointerId);
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        const deltaWeeks = Math.round((ev.clientX - startXRef.current) / weekW);
        applySpan(startSpanRef.current + deltaWeeks);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [applySpan, getTimelineWidthPx, tile.Span_Weeks, timelineColumns],
  );

  return (
    <div
      ref={nodeRef}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${tile.Title} duration`}
      title="Drag to change duration"
      onPointerDown={onPointerDown}
      className={clsx(
        "pointer-events-auto absolute top-0 right-0 z-[25] w-3 shrink-0 touch-none select-none rounded-sm",
        "border border-transparent bg-transparent",
        "cursor-grab transition-colors duration-150 ease-out",
        "hover:border-white/50 hover:bg-white/25 hover:shadow-sm active:cursor-grabbing",
        handleHeightPx == null ? heightClass : null,
      )}
      style={handleHeightPx != null ? { height: handleHeightPx } : undefined}
    />
  );
}
