/**
 * Timeline annotations — stored on the configs row as JSON in the **TimelineAnnotation** sheet column
 * (override with `CABOODLE_CONFIG_TIMELINE_ANNOTATION_COLUMN` if your Caboodle header differs).
 *
 * Persisted cell value is a JSON **string** whose parsed shape is:
 * `{ "annotations": Array<{ "id", "Title", "Start_Column", "Span_Columns", "Label_Y_Position" }> }`
 * (`Start_Column` / `Span_Columns` align with the same timeline grid as tiles; `Span_Columns` 0 = dashed marker.)
 *
 * The app API uses camelCase `timelineAnnotation` on JSON bodies; Caboodle PATCH may also send `TimelineAnnotation`.
 */

export type TimelineAnnotationItem = {
  /** Stable client id (not persisted separately from JSON blob). */
  id: string;
  Title: string;
  /** 1-based column index on the timeline rail (same space as Start_Week units on the canvas). */
  Start_Column: number;
  /** 0 = single dashed marker line; ≥1 = shaded band width in columns. */
  Span_Columns: number;
  /**
   * Vertical position of the label center as % of the annotation **track** height (0–100).
   * Resolved against the measured rail stack so it scales with chart height.
   */
  Label_Y_Position: number;
};

export type TimelineAnnotationDocument = {
  annotations: TimelineAnnotationItem[];
};

export const EMPTY_TIMELINE_ANNOTATION_DOC: TimelineAnnotationDocument = { annotations: [] };

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function newTimelineAnnotationId(): string {
  return `ta-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clampTimelineAnnotationItem(
  a: TimelineAnnotationItem,
  timelineColumns: number,
): TimelineAnnotationItem {
  const maxStart = Math.max(1, timelineColumns);
  let start = clamp(Math.round(a.Start_Column), 1, maxStart);
  let span = Math.max(0, Math.round(a.Span_Columns));
  if (span > 0) {
    span = clamp(span, 0, timelineColumns);
    if (start + span - 1 > timelineColumns) {
      start = Math.max(1, timelineColumns - span + 1);
    }
  } else {
    start = clamp(start, 1, timelineColumns);
  }
  return {
    ...a,
    Start_Column: start,
    Span_Columns: span,
    Label_Y_Position: clamp(a.Label_Y_Position, 0, 100),
    Title: String(a.Title ?? "").trim() || "New Marker",
  };
}

export function normalizeTimelineAnnotationDocument(
  doc: TimelineAnnotationDocument,
  timelineColumns: number,
): TimelineAnnotationDocument {
  return {
    annotations: doc.annotations.map((x) => clampTimelineAnnotationItem(x, timelineColumns)),
  };
}

export function parseTimelineAnnotationField(raw: unknown): TimelineAnnotationDocument {
  if (raw == null) return { ...EMPTY_TIMELINE_ANNOTATION_DOC };
  let v: unknown = raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return { ...EMPTY_TIMELINE_ANNOTATION_DOC };
    try {
      v = JSON.parse(s) as unknown;
    } catch {
      return { ...EMPTY_TIMELINE_ANNOTATION_DOC };
    }
  }
  if (!v || typeof v !== "object") return { ...EMPTY_TIMELINE_ANNOTATION_DOC };
  const ann = (v as { annotations?: unknown }).annotations;
  if (!Array.isArray(ann)) return { ...EMPTY_TIMELINE_ANNOTATION_DOC };
  const out: TimelineAnnotationItem[] = [];
  for (const row of ann) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = String(o.id ?? o.ID ?? newTimelineAnnotationId());
    const title = String(o.Title ?? o.title ?? "Marker");
    const start = Number(o.Start_Column ?? o.start_column ?? 1);
    const span = Number(o.Span_Columns ?? o.span_columns ?? 0);
    const y = Number(o.Label_Y_Position ?? o.label_y_position ?? 10);
    out.push({
      id,
      Title: title,
      Start_Column: Number.isFinite(start) ? start : 1,
      Span_Columns: Number.isFinite(span) ? span : 0,
      Label_Y_Position: Number.isFinite(y) ? y : 10,
    });
  }
  return { annotations: out };
}

export function serializeTimelineAnnotationDocument(doc: TimelineAnnotationDocument): string {
  return JSON.stringify(doc);
}

/** Column index 1…timelineColumns from a click inside the timeline rail element. */
export function timelineColumnFromClientX(
  railEl: HTMLElement,
  clientX: number,
  timelineColumns: number,
): number {
  const rect = railEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const colW = rect.width / Math.max(1, timelineColumns);
  const col = Math.floor(x / colW) + 1;
  return clamp(col, 1, timelineColumns);
}
