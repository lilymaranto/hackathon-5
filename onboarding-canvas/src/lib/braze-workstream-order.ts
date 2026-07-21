import { WORKSTREAMS } from "@/lib/constants";
import {
  ENTERPRISE_PLATINUM_GANTT_LANE_IDS,
  defaultPlatinumGanttLaneLabelType,
  platinumGanttLaneRailColor,
  type EnterprisePlatinumGanttLaneId,
} from "@/lib/enterprise-platinum-gantt";
import { buildWorkstreamGradientColorMap, defaultWorkstreamRailColor } from "@/lib/workstream-gradient";
import { parseHexColorOptional, textColorOnTileBackground } from "@/lib/tile-category-colors";
import type { BrazeWorkstreamOrderEntry, Workstream, WorkstreamLabelTextType } from "@/lib/types";

export type { BrazeWorkstreamOrderEntry, WorkstreamLabelTextType } from "@/lib/types";

/** `@dnd-kit` sortable id prefix for Braze Core swimlane rows and Platinum Gantt section blocks. */
export const BRAZE_WS_SORT_PREFIX = "braze-ws-sort:";

/** Braze Core swimlane / Gantt row ids (excludes AI Decisioning lanes `one`–`four`). */
export const BRAZE_CORE_WORKSTREAM_IDS = WORKSTREAMS.map((w) => w.id) as readonly Workstream[];

const ALLOWED = new Set<Workstream>([
  ...BRAZE_CORE_WORKSTREAM_IDS,
  ...ENTERPRISE_PLATINUM_GANTT_LANE_IDS,
]);

const GANTT_LANE_SET = new Set<Workstream>(ENTERPRISE_PLATINUM_GANTT_LANE_IDS);

export function usesDefaultBrazeWorkstreamBrandColors(
  workstreamGradientTopColor?: string,
  workstreamGradientBottomColor?: string,
): boolean {
  return (
    !parseHexColorOptional(workstreamGradientTopColor) &&
    !parseHexColorOptional(workstreamGradientBottomColor)
  );
}

function savedLabelTypeForWorkstream(
  saved: unknown,
  workstream: Workstream,
): WorkstreamLabelTextType | undefined {
  const arr = coerceJsonArray(saved);
  if (!arr?.length) return undefined;
  for (const row of parseSavedRows(arr)) {
    if (row.ws === workstream && row.labelContrastUserSet && row.type) return row.type;
  }
  return undefined;
}

/** Label contrast explicitly saved in Mongo (double-click toggle); not auto-derived rail luminance. */
export function explicitWorkstreamLabelTypeMapFromSaved(
  saved: unknown,
): Map<Workstream, WorkstreamLabelTextType> {
  const arr = coerceJsonArray(saved);
  const map = new Map<Workstream, WorkstreamLabelTextType>();
  if (!arr?.length) return map;
  for (const row of parseSavedRows(arr)) {
    if (row.labelContrastUserSet && row.type) map.set(row.ws, row.type);
  }
  return map;
}

/** Persist only row order plus user contrast overrides (never auto luminance `type` values). */
export function serializeBrazeWorkstreamOrderForMongo(
  entries: readonly BrazeWorkstreamOrderEntry[],
): Array<{ workstream: Workstream; type?: WorkstreamLabelTextType; labelContrastUserSet?: boolean }> {
  return entries.map((e) =>
    e.labelContrastUserSet
      ? { workstream: e.workstream, type: e.type, labelContrastUserSet: true }
      : { workstream: e.workstream },
  );
}

/** When the default brand palette is used, all rail labels default to white unless saved in Mongo. */
export function applyDefaultWhiteLabelTypesForBrandPalette(
  entries: readonly BrazeWorkstreamOrderEntry[],
  saved: unknown,
  useDefaultBrandColors: boolean,
): BrazeWorkstreamOrderEntry[] {
  if (!useDefaultBrandColors) return [...entries];
  return entries.map((e) => {
    if (savedLabelTypeForWorkstream(saved, e.workstream)) return e;
    return { ...e, type: "w" };
  });
}

/** @deprecated Use {@link applyDefaultWhiteLabelTypesForBrandPalette}. */
export const applyDefaultGovernanceLabelTypes = applyDefaultWhiteLabelTypesForBrandPalette;

export function mergeCoreAndPlatinumGanttWorkstreamOrder(
  core: readonly BrazeWorkstreamOrderEntry[],
  gantt: readonly BrazeWorkstreamOrderEntry[],
): BrazeWorkstreamOrderEntry[] {
  const byWs = new Map<Workstream, BrazeWorkstreamOrderEntry>();
  for (const e of core) byWs.set(e.workstream, e);
  for (const e of gantt) byWs.set(e.workstream, e);
  const out: BrazeWorkstreamOrderEntry[] = [];
  for (const e of core) {
    const merged = byWs.get(e.workstream);
    if (merged) out.push(merged);
  }
  for (const e of gantt) {
    if (!out.some((x) => x.workstream === e.workstream)) out.push(e);
  }
  return out;
}

function normalizePlatinumGanttWorkstreamOrder(
  saved: unknown,
  railColorForLane: (ws: Workstream) => string,
): BrazeWorkstreamOrderEntry[] {
  const defaults = [...ENTERPRISE_PLATINUM_GANTT_LANE_IDS] as Workstream[];
  const allowed = new Set<Workstream>(defaults);
  const arr = coerceJsonArray(saved) ?? [];
  const parsed = parseSavedRows(arr).filter((row) => allowed.has(row.ws));
  const seen = new Set<Workstream>();
  const out: BrazeWorkstreamOrderEntry[] = [];
  for (const row of parsed) {
    if (!allowed.has(row.ws) || seen.has(row.ws)) continue;
    seen.add(row.ws);
    const rail = railColorForLane(row.ws);
    const laneId = row.ws as EnterprisePlatinumGanttLaneId;
    out.push({
      workstream: row.ws,
      type:
        row.labelContrastUserSet && row.type
          ? row.type
          : defaultPlatinumGanttLaneLabelType(laneId, rail),
      ...(row.labelContrastUserSet ? { labelContrastUserSet: true } : {}),
    });
  }
  for (const id of defaults) {
    if (!seen.has(id)) {
      const rail = railColorForLane(id);
      const laneId = id as EnterprisePlatinumGanttLaneId;
      out.push({
        workstream: id,
        type: defaultPlatinumGanttLaneLabelType(laneId, rail),
      });
    }
  }
  return out;
}

export function normalizeBrazeWorkstreamOrderForStorage(
  saved: unknown,
  workstreamGradientTopColor?: string,
  workstreamGradientBottomColor?: string,
  includePlatinumGanttLanes = true,
): BrazeWorkstreamOrderEntry[] {
  const useDefaultBrandColors = usesDefaultBrazeWorkstreamBrandColors(
    workstreamGradientTopColor,
    workstreamGradientBottomColor,
  );
  const canonicalIds = normalizeBrazeCoreWorkstreamIds(
    parseSavedRows(coerceJsonArray(saved) ?? []).map((r) => r.ws),
  );
  const railCore = railColorResolverForWorkstreamOrder(
    canonicalIds,
    workstreamGradientTopColor,
    workstreamGradientBottomColor,
  );
  let core = normalizeBrazeCoreWorkstreamOrder(saved, railCore);
  core = applyDefaultWhiteLabelTypesForBrandPalette(core, saved, useDefaultBrandColors);

  if (!includePlatinumGanttLanes) return core;

  const ganttRail = (ws: Workstream) =>
    platinumGanttLaneRailColor(ws as EnterprisePlatinumGanttLaneId);
  let gantt = normalizePlatinumGanttWorkstreamOrder(saved, ganttRail);
  gantt = applyDefaultWhiteLabelTypesForBrandPalette(gantt, saved, useDefaultBrandColors);
  return mergeCoreAndPlatinumGanttWorkstreamOrder(core, gantt);
}

export function workstreamLabelTextTypeFromRailHex(railHex: string): WorkstreamLabelTextType {
  return textColorOnTileBackground(railHex) === "#ffffff" ? "w" : "b";
}

export function resolveWorkstreamLabelTextType(
  explicitUserTypesById: ReadonlyMap<Workstream, WorkstreamLabelTextType> | undefined,
  workstream: Workstream,
  railHex: string,
  useDefaultBrandColors: boolean,
): WorkstreamLabelTextType {
  const userSaved = explicitUserTypesById?.get(workstream);
  if (userSaved) return userSaved;
  if (useDefaultBrandColors) return "w";
  return workstreamLabelTextTypeFromRailHex(railHex);
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

function parseSavedRows(
  arr: unknown[],
): { ws: Workstream; type?: WorkstreamLabelTextType; labelContrastUserSet?: boolean }[] {
  const out: {
    ws: Workstream;
    type?: WorkstreamLabelTextType;
    labelContrastUserSet?: boolean;
  }[] = [];
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
      const labelContrastUserSet = Boolean(o.labelContrastUserSet);
      if (labelContrastUserSet && type) {
        out.push({ ws, type, labelContrastUserSet: true });
      } else {
        out.push({ ws });
      }
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
      type:
        row.labelContrastUserSet && row.type
          ? row.type
          : workstreamLabelTextTypeFromRailHex(railColorForWorkstream(row.ws)),
      ...(row.labelContrastUserSet ? { labelContrastUserSet: true } : {}),
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
  return normalizeBrazeWorkstreamOrderForStorage(
    arr,
    workstreamGradientTopColor,
    workstreamGradientBottomColor,
    true,
  );
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
    gradientMap.get(ws) ?? defaultWorkstreamRailColor(ws);
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
    const railHex = defaultWorkstreamRailColor(id);
    return {
      workstream: id,
      type: workstreamLabelTextTypeFromRailHex(railHex),
    };
  });
  return [...rest.slice(0, insertAt), ...reorderedVisible, ...rest.slice(insertAt)];
}

export function platinumGanttLaneIdsFromOrder(
  entries: readonly BrazeWorkstreamOrderEntry[],
): Workstream[] {
  const defaults = [...ENTERPRISE_PLATINUM_GANTT_LANE_IDS] as Workstream[];
  const fromSaved = brazeWorkstreamOrderIds(entries).filter((id) =>
    (ENTERPRISE_PLATINUM_GANTT_LANE_IDS as readonly Workstream[]).includes(id),
  );
  const seen = new Set(fromSaved);
  return [...fromSaved, ...defaults.filter((id) => !seen.has(id))];
}

export function toggleWorkstreamLabelTextType(
  entries: readonly BrazeWorkstreamOrderEntry[],
  workstream: Workstream,
  currentResolvedType: WorkstreamLabelTextType,
): BrazeWorkstreamOrderEntry[] {
  const nextType: WorkstreamLabelTextType = currentResolvedType === "b" ? "w" : "b";
  if (!entries.some((e) => e.workstream === workstream)) {
    return [...entries, { workstream, type: nextType }];
  }
  return entries.map((e) =>
    e.workstream === workstream
      ? { ...e, type: nextType, labelContrastUserSet: true }
      : e,
  );
}
