"use client";

import {
  clampTimelineAnnotationItem,
  newTimelineAnnotationId,
  normalizeTimelineAnnotationDocument,
  type TimelineAnnotationDocument,
  type TimelineAnnotationItem,
} from "@/lib/timeline-annotations";
import clsx from "clsx";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";

type RailBox = { left: number; top: number; width: number; height: number };

type TimelineAnnotationsContextValue = {
  timelineColumns: number;
  doc: TimelineAnnotationDocument;
  setDoc: (next: TimelineAnnotationDocument) => void;
  readOnly: boolean;
  railBox: RailBox;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  hoverId: string | null;
  setHoverId: Dispatch<SetStateAction<string | null>>;
  /** When set, invoked before deselect on outside pointerdown so title edits persist. */
  editingTitleCommitRef: MutableRefObject<(() => void) | null>;
  onAfterAnnotationTitleCommit?: () => void;
};

const TimelineAnnotationsContext = createContext<TimelineAnnotationsContextValue | null>(null);

function useTimelineAnnotationsCtx(): TimelineAnnotationsContextValue {
  const v = useContext(TimelineAnnotationsContext);
  if (!v) throw new Error("TimelineAnnotationsContext missing");
  return v;
}

function useRailLayout(
  trackRef: RefObject<HTMLDivElement | null>,
  railRef: RefObject<HTMLElement | null>,
): RailBox {
  const [box, setBox] = useState<RailBox>({ left: 0, top: 0, width: 0, height: 0 });
  useLayoutEffect(() => {
    const update = () => {
      const track = trackRef.current;
      const rail = railRef.current;
      if (!track || !rail) return;
      const tr = track.getBoundingClientRect();
      const rr = rail.getBoundingClientRect();
      setBox({
        left: rr.left - tr.left,
        top: rr.top - tr.top,
        width: rr.width,
        height: Math.max(track.clientHeight, track.scrollHeight),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    if (trackRef.current) ro.observe(trackRef.current);
    if (railRef.current) ro.observe(railRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [trackRef, railRef]);
  return box;
}

function annotationLeftPct(a: TimelineAnnotationItem, timelineColumns: number): number {
  return ((a.Start_Column - 1) / timelineColumns) * 100;
}

function annotationWidthPct(a: TimelineAnnotationItem, timelineColumns: number): number {
  if (a.Span_Columns <= 0) return 0;
  return (a.Span_Columns / timelineColumns) * 100;
}

function labelLeftPct(a: TimelineAnnotationItem, timelineColumns: number): number {
  if (a.Span_Columns <= 0) return annotationLeftPct(a, timelineColumns);
  return annotationLeftPct(a, timelineColumns) + annotationWidthPct(a, timelineColumns) / 2;
}

type DragKind = "resize-west" | "resize-east" | null;

export type TimelineAnnotationsShellProps = {
  timelineColumns: number;
  document: TimelineAnnotationDocument;
  onDocumentChange: (next: TimelineAnnotationDocument) => void;
  readOnly: boolean;
  railRef: RefObject<HTMLElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  /** After a marker title is committed (Enter, blur, or click-away), e.g. flush PATCH without debounce. */
  onAfterAnnotationTitleCommit?: () => void;
};

export function TimelineAnnotationsShell({
  timelineColumns,
  document: doc,
  onDocumentChange,
  readOnly,
  railRef,
  trackRef,
  children,
  onAfterAnnotationTitleCommit,
}: TimelineAnnotationsShellProps) {
  const railBox = useRailLayout(trackRef, railRef);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const editingTitleCommitRef = useRef<(() => void) | null>(null);

  const setDoc = useCallback(
    (next: TimelineAnnotationDocument) => {
      if (readOnly) return;
      onDocumentChange(normalizeTimelineAnnotationDocument(next, timelineColumns));
    },
    [readOnly, onDocumentChange, timelineColumns],
  );

  useEffect(() => {
    if (!readOnly) return;
    setSelectedId(null);
    setEditingId(null);
    setHoverId(null);
  }, [readOnly]);

  const ctx = useMemo(
    () =>
      ({
        timelineColumns,
        doc,
        setDoc,
        readOnly,
        railBox,
        selectedId,
        setSelectedId,
        editingId,
        setEditingId,
        hoverId,
        setHoverId,
        editingTitleCommitRef,
        onAfterAnnotationTitleCommit,
      }) satisfies TimelineAnnotationsContextValue,
    [
      timelineColumns,
      doc,
      setDoc,
      readOnly,
      railBox,
      selectedId,
      editingId,
      hoverId,
      onAfterAnnotationTitleCommit,
    ],
  );

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape" || e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        setDoc({
          annotations: doc.annotations.filter((a) => a.id !== selectedId),
        });
        setSelectedId(null);
        setEditingId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, selectedId, doc.annotations, setDoc]);

  useEffect(() => {
    if (readOnly) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-ta-annotation-hit]")) return;
      if (t.closest("input, textarea, [contenteditable='true']")) return;
      editingTitleCommitRef.current?.();
      editingTitleCommitRef.current = null;
      setSelectedId(null);
      setEditingId(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [readOnly]);

  return (
    <TimelineAnnotationsContext.Provider value={ctx}>
      <div ref={trackRef} className="relative">
        <AnnotationRailVisuals readOnly={readOnly} />
        <div className="relative z-[15]">{children}</div>
        <AnnotationRailInteraction readOnly={readOnly} />
        <AnnotationLabels readOnly={readOnly} />
      </div>
    </TimelineAnnotationsContext.Provider>
  );
}

/** Shading + dashed lines only (behind tiles). */
function AnnotationRailVisuals({ readOnly }: { readOnly: boolean }) {
  const { timelineColumns, doc, railBox, selectedId, hoverId } = useTimelineAnnotationsCtx();

  if (railBox.width <= 0 || railBox.height <= 0) return null;

  return (
    <div
      className="pointer-events-none absolute z-0"
      style={{
        left: railBox.left,
        top: 0,
        width: railBox.width,
        height: railBox.height,
      }}
    >
      {doc.annotations.map((a) => {
        const leftPct = annotationLeftPct(a, timelineColumns);
        const widthPct = annotationWidthPct(a, timelineColumns);
        const isSpan = a.Span_Columns > 0;
        const multiColumnSpan = a.Span_Columns > 1;
        const selected = !readOnly && selectedId === a.id;
        const hovered = !readOnly && hoverId === a.id;

        return (
          <div
            key={`vis-${a.id}`}
            className="absolute top-0"
            style={{
              left: `${leftPct}%`,
              width: isSpan ? `${widthPct}%` : 0,
              height: "100%",
            }}
          >
            {isSpan ? (
              <div
                className={clsx(
                  "absolute inset-0 border-y-0",
                  multiColumnSpan ? "bg-[#EFEFEF]" : "bg-[#E6E6E6]",
                  "border-l-2 border-r-2 border-dashed border-[#B9B9B9]",
                  (selected || hovered) && "ring-1 ring-[#B9B9B9]/35",
                )}
              />
            ) : (
              <div
                className={clsx(
                  "pointer-events-none absolute left-0 top-0 h-full w-0 -translate-x-1/2 border-l-2 border-dashed border-[#B9B9B9]",
                  (selected || hovered) && "shadow-[0_0_0_1px_rgba(185,185,185,0.35)]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function useAnnotationRailDrag(readOnly: boolean) {
  const {
    timelineColumns,
    doc,
    setDoc,
    railBox,
    selectedId,
    setSelectedId,
    setHoverId,
    hoverId,
  } = useTimelineAnnotationsCtx();

  const dragRef = useRef<{
    kind: DragKind;
    id: string;
    startClientX: number;
    startClientY: number;
    snapshot: TimelineAnnotationItem;
  } | null>(null);

  const colWidthPx = railBox.width / Math.max(1, timelineColumns);

  const applyDrag = useCallback(
    (clientX: number, _clientY: number) => {
      const d = dragRef.current;
      if (!d || readOnly) return;
      const dxCols = Math.round((clientX - d.startClientX) / Math.max(1, colWidthPx));
      const snap = d.snapshot;
      let next: TimelineAnnotationItem = { ...snap };

      if (d.kind === "resize-west") {
        if (snap.Span_Columns <= 0) {
          next.Start_Column = snap.Start_Column + dxCols;
          next.Span_Columns = 0;
        } else {
          const newStart = snap.Start_Column + dxCols;
          const newSpan = snap.Span_Columns - dxCols;
          if (newSpan >= 1) {
            next.Start_Column = newStart;
            next.Span_Columns = newSpan;
          } else {
            next.Start_Column = newStart;
            next.Span_Columns = Math.max(0, newSpan);
          }
        }
        next = clampTimelineAnnotationItem(next, timelineColumns);
      } else if (d.kind === "resize-east") {
        if (snap.Span_Columns <= 0) {
          next.Span_Columns = Math.max(0, snap.Span_Columns + dxCols);
        } else {
          next.Span_Columns = snap.Span_Columns + dxCols;
        }
        next = clampTimelineAnnotationItem(next, timelineColumns);
      }

      setDoc({
        annotations: doc.annotations.map((a) => (a.id === d.id ? next : a)),
      });
    },
    [colWidthPx, doc.annotations, readOnly, setDoc, timelineColumns],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onPointerMoveResize = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || (d.kind !== "resize-west" && d.kind !== "resize-east")) return;
      e.preventDefault();
      applyDrag(e.clientX, e.clientY);
    },
    [applyDrag],
  );

  const onPointerUpResize = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d || (d.kind !== "resize-west" && d.kind !== "resize-east")) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      endDrag();
    },
    [endDrag],
  );

  return {
    dragRef,
    railBox,
    timelineColumns,
    doc,
    readOnly,
    selectedId,
    setSelectedId,
    setHoverId,
    hoverId,
    onPointerMoveResize,
    onPointerUpResize,
  };
}

/** Resize handles above tiles; span/marker bodies use pointer-events-none so tiles stay clickable. */
function AnnotationRailInteraction({ readOnly }: { readOnly: boolean }) {
  const d = useAnnotationRailDrag(readOnly);
  const {
    railBox,
    timelineColumns,
    doc,
    readOnly: ro,
    selectedId,
    setSelectedId,
    setHoverId,
    hoverId,
    dragRef,
    onPointerMoveResize,
    onPointerUpResize,
  } = d;

  if (readOnly || railBox.width <= 0 || railBox.height <= 0) return null;

  const handleBase =
    "pointer-events-auto absolute top-0 bottom-0 z-[1] min-w-[14px] max-w-[18px] cursor-ew-resize border-0 p-0 transition-none bg-[#767676]/0 hover:bg-[#767676]/25 ring-1 ring-transparent hover:ring-[#767676]/50";

  return (
    <div
      className="pointer-events-none absolute z-[25]"
      style={{
        left: railBox.left,
        top: 0,
        width: railBox.width,
        height: railBox.height,
      }}
    >
      {doc.annotations.map((a) => {
        const leftPct = annotationLeftPct(a, timelineColumns);
        const widthPct = annotationWidthPct(a, timelineColumns);
        const isSpan = a.Span_Columns > 0;
        const selected = selectedId === a.id;

        return (
          <div
            key={`hit-${a.id}`}
            className="pointer-events-none absolute top-0"
            style={{
              left: `${leftPct}%`,
              width: isSpan ? `${widthPct}%` : 0,
              height: "100%",
            }}
          >
            {isSpan ? (
              <>
                <button
                  type="button"
                  aria-label="Drag to resize marker start (shorten or lengthen)"
                  disabled={ro}
                  title="Drag to resize"
                  data-ta-annotation-hit
                  onMouseEnter={() => setHoverId(a.id)}
                  onMouseLeave={() => setHoverId((h) => (h === a.id ? null : h))}
                  onPointerDown={(e) => {
                    if (ro) return;
                    e.stopPropagation();
                    e.preventDefault();
                    dragRef.current = {
                      kind: "resize-west",
                      id: a.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      snapshot: { ...a },
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setSelectedId(a.id);
                  }}
                  onPointerMove={onPointerMoveResize}
                  onPointerUp={onPointerUpResize}
                  onPointerCancel={onPointerUpResize}
                  className={clsx(handleBase, selected && "bg-[#767676]/15")}
                  style={{ left: 0, transform: "translateX(-50%)" }}
                />
                <button
                  type="button"
                  aria-label="Drag to resize marker end"
                  disabled={ro}
                  title="Drag to resize"
                  data-ta-annotation-hit
                  onMouseEnter={() => setHoverId(a.id)}
                  onMouseLeave={() => setHoverId((h) => (h === a.id ? null : h))}
                  onPointerDown={(e) => {
                    if (ro) return;
                    e.stopPropagation();
                    e.preventDefault();
                    dragRef.current = {
                      kind: "resize-east",
                      id: a.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      snapshot: { ...a },
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setSelectedId(a.id);
                  }}
                  onPointerMove={onPointerMoveResize}
                  onPointerUp={onPointerUpResize}
                  onPointerCancel={onPointerUpResize}
                  className={clsx(handleBase, selected && "bg-[#767676]/15")}
                  style={{ right: 0, transform: "translateX(50%)" }}
                />
              </>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Drag left edge — move marker earlier"
                  disabled={ro}
                  title="Resize / move start"
                  data-ta-annotation-hit
                  onMouseEnter={() => setHoverId(a.id)}
                  onMouseLeave={() => setHoverId((h) => (h === a.id ? null : h))}
                  onPointerDown={(e) => {
                    if (ro) return;
                    e.stopPropagation();
                    e.preventDefault();
                    dragRef.current = {
                      kind: "resize-west",
                      id: a.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      snapshot: { ...a },
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setSelectedId(a.id);
                  }}
                  onPointerMove={onPointerMoveResize}
                  onPointerUp={onPointerUpResize}
                  onPointerCancel={onPointerUpResize}
                  className={clsx(handleBase, "-translate-x-1/2", selected && "bg-[#767676]/15 ring-[#767676]/35")}
                  style={{ left: 0 }}
                />
                <button
                  type="button"
                  aria-label="Drag right — lengthen marker into a range"
                  disabled={ro}
                  title="Drag to lengthen"
                  data-ta-annotation-hit
                  onMouseEnter={() => setHoverId(a.id)}
                  onMouseLeave={() => setHoverId((h) => (h === a.id ? null : h))}
                  onPointerDown={(e) => {
                    if (ro) return;
                    e.stopPropagation();
                    e.preventDefault();
                    dragRef.current = {
                      kind: "resize-east",
                      id: a.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      snapshot: { ...a },
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setSelectedId(a.id);
                  }}
                  onPointerMove={onPointerMoveResize}
                  onPointerUp={onPointerUpResize}
                  onPointerCancel={onPointerUpResize}
                  className={clsx(handleBase, "translate-x-1/2", selected && "bg-[#767676]/15 ring-[#767676]/35")}
                  style={{ left: 0 }}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

const LABEL_VERTICAL_DRAG_THRESHOLD_PX = 6;

function AnnotationLabels({ readOnly }: { readOnly: boolean }) {
  const {
    timelineColumns,
    doc,
    setDoc,
    railBox,
    selectedId,
    setSelectedId,
    editingId,
    setEditingId,
    setHoverId,
    hoverId,
    onAfterAnnotationTitleCommit,
  } = useTimelineAnnotationsCtx();

  const docRef = useRef(doc);
  docRef.current = doc;

  const labelGestureCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      labelGestureCleanupRef.current?.();
      labelGestureCleanupRef.current = null;
    };
  }, []);

  const attachLabelVerticalGesture = useCallback(
    (e: React.PointerEvent, a: TimelineAnnotationItem, trackHeight: number) => {
      if (readOnly) return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

      labelGestureCleanupRef.current?.();

      const pointerId = e.pointerId;
      const id = a.id;
      const startClientY = e.clientY;
      const startYPercent = a.Label_Y_Position;

      e.stopPropagation();

      let committed = false;

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        if (!committed) {
          if (Math.abs(ev.clientY - startClientY) <= LABEL_VERTICAL_DRAG_THRESHOLD_PX) return;
          committed = true;
          setEditingId(null);
        }
        ev.preventDefault();
        const dyPct = ((ev.clientY - startClientY) / Math.max(1, trackHeight)) * 100;
        const nextY = Math.min(100, Math.max(0, startYPercent + dyPct));
        setDoc({
          annotations: docRef.current.annotations.map((x) =>
            x.id === id ? { ...x, Label_Y_Position: nextY } : x,
          ),
        });
      };

      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        labelGestureCleanupRef.current = null;
      };

      labelGestureCleanupRef.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
      };
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);

      setSelectedId(id);
    },
    [readOnly, setDoc, setEditingId, setSelectedId],
  );

  if (railBox.width <= 0 || railBox.height <= 0) return null;

  return (
    <div
      className="pointer-events-none absolute z-[50]"
      style={{
        left: railBox.left,
        top: 0,
        width: railBox.width,
        height: railBox.height,
      }}
    >
      {doc.annotations.map((a) => {
        const leftPct = labelLeftPct(a, timelineColumns);
        const topPct = a.Label_Y_Position;
        const selected = selectedId === a.id;
        const editing = editingId === a.id;

        return (
          <div
            key={`lab-${a.id}`}
            className={clsx(
              "absolute -translate-x-1/2 -translate-y-1/2",
              readOnly ? "pointer-events-none" : "pointer-events-auto",
            )}
            style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            data-ta-label-hit
            {...(!readOnly ? { "data-ta-annotation-hit": "" } : {})}
            onMouseEnter={readOnly ? undefined : () => setHoverId(a.id)}
            onMouseLeave={readOnly ? undefined : () => setHoverId((h) => (h === a.id ? null : h))}
            onPointerDown={
              readOnly || editing
                ? undefined
                : (e) => {
                    attachLabelVerticalGesture(e, a, railBox.height);
                  }
            }
          >
            {editing ? (
              <LabelEditor
                initial={a.Title}
                onCommit={(title) => {
                  setDoc({
                    annotations: doc.annotations.map((x) =>
                      x.id === a.id ? { ...x, Title: title } : x,
                    ),
                  });
                  setEditingId(null);
                  onAfterAnnotationTitleCommit?.();
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <button
                type="button"
                data-ta-label-text
                className={clsx(
                  "max-w-[200px] truncate rounded-md border border-[#B9B9B9] bg-white px-2.5 py-1 text-left text-[12px] font-medium text-[#767676] shadow-sm transition-none",
                  readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                  !readOnly && (selected || hoverId === a.id) && "shadow-md ring-2 ring-[#B9B9B9]/40",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!readOnly) setSelectedId(a.id);
                }}
                onDoubleClick={(e) => {
                  if (readOnly) return;
                  e.stopPropagation();
                  setSelectedId(a.id);
                  setEditingId(a.id);
                }}
              >
                {a.Title || "Marker"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LabelEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const { editingTitleCommitRef } = useTimelineAnnotationsCtx();
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const vRef = useRef(v);
  vRef.current = v;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const didCommit = useRef(false);
  const cancelled = useRef(false);

  const commitOnce = useCallback(() => {
    if (cancelled.current || didCommit.current) return;
    didCommit.current = true;
    onCommitRef.current(vRef.current.trim() || "New Marker");
    ref.current?.blur();
  }, []);

  useEffect(() => {
    editingTitleCommitRef.current = () => commitOnce();
    return () => {
      editingTitleCommitRef.current = null;
    };
  }, [commitOnce, editingTitleCommitRef]);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  useEffect(() => {
    cancelled.current = false;
    didCommit.current = false;
  }, [initial]);

  return (
    <input
      ref={ref}
      data-ta-label-editor
      className="w-[min(240px,70vw)] rounded-md border border-[#B9B9B9] bg-white px-2 py-1 text-[12px] text-black placeholder:text-neutral-500 shadow-md outline-none"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => commitOnce()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitOnce();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          cancelled.current = true;
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function appendTimelineAnnotationAtColumn(
  doc: TimelineAnnotationDocument,
  column: number,
  timelineColumns: number,
): TimelineAnnotationDocument {
  const item = clampTimelineAnnotationItem(
    {
      id: newTimelineAnnotationId(),
      Title: "New Marker",
      Start_Column: column,
      Span_Columns: 0,
      Label_Y_Position: 10,
    },
    timelineColumns,
  );
  return normalizeTimelineAnnotationDocument(
    { annotations: [...doc.annotations, item] },
    timelineColumns,
  );
}
