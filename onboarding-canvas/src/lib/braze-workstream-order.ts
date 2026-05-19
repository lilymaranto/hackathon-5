import { WORKSTREAMS } from "@/lib/constants";
import { buildWorkstreamGradientColorMap } from "@/lib/workstream-gradient";
import { textColorOnTileBackground } from "@/lib/tile-category-colors";
import type { BrazeWorkstreamOrderEntry, Workstream, WorkstreamLabelTextType } from "@/lib/types";

export type { BrazeWorkstreamOrderEntry, WorkstreamLabelTextType } from "@/lib/types";

/** Braze Core swimlane / Gantt row ids (excludes AI Decisioning lanes `one`–`four`). */
export const BRAZE_CORE_WORKSTREAM_IDS = WORKSTREAMS.map((w) => w.id) as readonly Workstream[];

const ALLOWED = new Set<Workstream>(BRAZE_CORE_WORKSTREAM_IDS);

export function workstreamLabelTextTypeFromRailHex(railHex: string): WorkstreamLabelTextType {
  return textColorOnTileBackground(railHex) === "#ffffff" ? "w" : "b";
}

export function labelHexForWorkstreamTextType(t: WorkstreamLabelTextType): "#ffffff" | "#1a102b" {
  return t === "w" ? "#ffffff" : "#1a102b";
}

export function brazeWorkstreamOrderIds(entries: readonly BrazeWorkstreamOrderEntry[]): Workstream[] {
  return entries.map((e) => e.workstream);
}

function coerceJsonArray(raw: unknown): unknown[] | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p : undefined;
    } catch {
      return undefined;
    }
  }
  if (Array.isArray(raw)) return raw;
  return undefined;
}

function parseSavedRows(arr: unknown[]): { ws: Workstream; type?: WorkstreamLabelTextType }[] {
  const out: { ws: Workstream; type?: WorkstreamLabelTextType }[] = [];
  for (const x of arr) {
    if (typeof x === "string") {
      const id = String(x).trim() as Workstream;
      if (ALLOWED.has(id)) out.push({ ws: id });
      continue;
    }
    if (x && typeof x === "object" && "workstream" in (x as object)) {
      const o = x as Record<string, unknown>;
      const ws = String(o.workstream ?? "").trim() as Workstream;
      if (!ALLOWED.has(ws)) continue;
      const tRaw = String(o.type ?? "")
        .trim()
        .toLowerCase();
      const type: WorkstreamLabelTextType | undefined =
        tRaw === "w" || tRaw === "white"
          ? "w"
          : tRaw === "b" || tRaw === "black"
            ? "b"
            : undefined;
      out.push(type ? { ws, type } : { ws });
    }
  }
  return out;
}

/** Canonical id list only (legacy + repair missing ids). */
export function normalizeBrazeCoreWorkstreamIds(
  saved: readonly Workstream[] | undefined | null,
): Workstream[] {
  const defaults = [...BRAZE_CORE_WORKSTREAM_IDS] as Workstream[];
  if (!saved?.length) return defaults;
  const out: Workstream[] = [];
  const seen = new Set<Workstream>();
  for (const id of saved) {
    if (ALLOWED.has(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of defaults) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

/**
 * Full Braze Core workstream order with per-row label contrast.
 * `railColorForWorkstream` supplies the algorithm default for `type` when omitted (e.g. from Caboodle parse).
 */
export function normalizeBrazeCoreWorkstreamOrder(
  saved: unknown,
  railColorForWorkstream: (ws: Workstream) => string,
): BrazeWorkstreamOrderEntry[] {
  const defaults = [...BRAZE_CORE_WORKSTREAM_IDS] as Workstream[];
  const arr = coerceJsonArray(saved);
  const parsed = arr?.length ? parseSavedRows(arr) : [];
  const seen = new Set<Workstream>();
  const out: BrazeWorkstreamOrderEntry[] = [];
  for (const row of parsed) {
    if (!ALLOWED.has(row.ws) || seen.has(row.ws)) continue;
    seen.add(row.ws);
    out.push({
      workstream: row.ws,
      type: row.type ?? workstreamLabelTextTypeFromRailHex(railColorForWorkstream(row.ws)),
    });
  }
  for (const id of defaults) {
    if (!seen.has(id)) {
      out.push({
        workstream: id,
        type: workstreamLabelTextTypeFromRailHex(railColorForWorkstream(id)),
      });
    }
  }
  return out;
}

/** Parse Caboodle column JSON → canonical entries (uses gradient when either gradient endpoint is set). */
export function parseBrazeCoreWorkstreamOrderJson(
  raw: unknown,
  workstreamGradientTopColor?: string,
  workstreamGradientBottomColor?: string,
): BrazeWorkstreamOrderEntry[] | undefined {
  const arr = coerceJsonArray(raw);
  if (!arr?.length) return undefined;
  const canonicalIds = normalizeBrazeCoreWorkstreamIds(parseSavedRows(arr).map((r) => r.ws));
  const railFor = railColorResolverForWorkstreamOrder(
    canonicalIds,
    workstreamGradientTopColor,
    workstreamGradientBottomColor,
  );
  return normalizeBrazeCoreWorkstreamOrder(arr, railFor);
}

export function railColorResolverForWorkstreamOrder(
  canonicalIds: readonly Workstream[],
  workstreamGradientTopColor?: string,
  workstreamGradientBottomColor?: string,
): (ws: Workstream) => string {
  const gradientMap = buildWorkstreamGradientColorMap(
    canonicalIds,
    workstreamGradientTopColor,
    workstreamGradientBottomColor,
  );
  return (ws: Workstream) =>
    gradientMap?.get(ws) ?? WORKSTREAMS.find((w) => w.id === ws)?.color ?? "#300266";
}

/**
 * After reordering only **visible** workstreams (subset with tiles), splice that block back into the
 * full saved order so hidden rows keep their relative positions and label types.
 */
export function mergeFullOrderAfterVisibleReorder(
  previousFull: readonly BrazeWorkstreamOrderEntry[],
  visibleNewOrder: readonly Workstream[],
): BrazeWorkstreamOrderEntry[] {
  const byWs = new Map(previousFull.map((e) => [e.workstream, e]));
  const vis = new Set(visibleNewOrder);
  const rest = previousFull.filter((e) => !vis.has(e.workstream));
  const positions = visibleNewOrder
    .map((id) => previousFull.findIndex((e) => e.workstream === id))
    .filter((i) => i >= 0);
  const insertAt = positions.length === 0 ? rest.length : Math.min(...positions);
  const reorderedVisible = visibleNewOrder.map((id) => {
    const prev = byWs.get(id);
    if (prev) return prev;
    return {
      workstream: id,
      type: workstreamLabelTextTypeFromRailHex(
        WORKSTREAMS.find((w) => w.id === id)?.color ?? "#300266",
      ),
    };
  });
  return [...rest.slice(0, insertAt), ...reorderedVisible, ...rest.slice(insertAt)];
}

export function toggleWorkstreamLabelTextType(
  entries: readonly BrazeWorkstreamOrderEntry[],
  workstream: Workstream,
): BrazeWorkstreamOrderEntry[] {
  return entries.map((e) =>
    e.workstream === workstream
      ? { ...e, type: e.type === "b" ? "w" : "b" }
      : e,
  );
}
