import {
  ganttLaneForSection,
  getGanttSeedForPlan,
  mongoDocFromGanttSeed,
} from "@/lib/enterprise-platinum-gantt";
import { getMongoCollections } from "@/lib/mongodb";
import type { GanttTaskRecord, PlanOptionId, Workstream } from "@/lib/types";

function toNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const GANTT_WORKSTREAM_IDS = new Set<string>([
  "gantt_admin",
  "gantt_data",
  "gantt_tech",
  "gantt_audiences",
  "gantt_channels",
  "gantt_email",
  "gantt_sms",
  "gantt_whatsapp",
  "gantt_web_mobile",
  "gantt_messaging",
  "gantt_analytics",
]);

function normalizeOptional(raw: unknown): "Y" | "N" {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  return s === "Y" ? "Y" : "N";
}

function normalizeGanttWorkstream(raw: unknown, section: string): Workstream {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (GANTT_WORKSTREAM_IDS.has(s)) return s as Workstream;
  return ganttLaneForSection(section);
}

function normalizeGanttTask(record: Record<string, unknown>): GanttTaskRecord {
  const configId = String(record.Config_ID ?? record.config_id ?? "").trim();
  const taskKey = String(record.Task_Key ?? record.task_key ?? "").trim();
  const tileId = String(record.Tile_ID ?? record.tile_id ?? `ept_${taskKey}`).trim();
  const section = String(record.Section ?? record.section ?? "").trim();
  const rowId = String(record.ID ?? record.id ?? `${configId}__${tileId}`).trim();
  return {
    Config_ID: configId,
    Task_Key: taskKey,
    Tile_ID: tileId,
    Section: section,
    Workstream: normalizeGanttWorkstream(record.Workstream ?? record.workstream, section),
    Title: String(record.Title ?? record.title ?? "").trim(),
    Optional: normalizeOptional(record.Optional ?? record.optional),
    Start_Week: Math.max(1, Math.round(toNumber(record.Start_Week ?? record.start_week, 1))),
    Span_Weeks: Math.max(1, Math.round(toNumber(record.Span_Weeks ?? record.span_weeks, 2))),
    Min_Span_Weeks: Math.max(
      1,
      Math.round(toNumber(record.Min_Span_Weeks ?? record.min_span_weeks, 2)),
    ),
    Stack_Order: Math.max(1, Math.round(toNumber(record.Stack_Order ?? record.stack_order, 1))),
    Description: String(record.Description ?? record.description ?? ""),
    Attendees: String(record.Attendees ?? record.attendees ?? ""),
    Agenda_Outcomes: String(
      record.Agenda_Outcomes ?? record.agenda_outcomes ?? record["Agenda & Outcomes"] ?? "",
    ),
    Related_Tasks: String(record.Related_Tasks ?? record.related_tasks ?? ""),
    Level_Of_Effort: String(record.Level_Of_Effort ?? record.level_of_effort ?? ""),
    Notes: String(record.Notes ?? record.notes ?? ""),
    CaboodlePatchKey: rowId,
  };
}

export async function fetchGanttTasks(configId: string): Promise<GanttTaskRecord[]> {
  const { ganttTasks } = await getMongoCollections();
  const docs = await ganttTasks
    .find({ Config_ID: configId })
    .sort({ Stack_Order: 1, Title: 1 })
    .toArray();
  return docs.map((doc) => normalizeGanttTask(doc as unknown as Record<string, unknown>));
}

export async function ensureGanttTasksSeeded(
  configId: string,
  planOptionId: PlanOptionId = "12_week",
): Promise<number> {
  const { ganttTasks } = await getMongoCollections();
  const seed = getGanttSeedForPlan(planOptionId);
  if (!seed.length) return 0;

  const existing = await ganttTasks
    .find({ Config_ID: configId })
    .project({ Task_Key: 1 })
    .toArray();

  const expectedKeys = new Set(seed.map((row) => row.taskKey));
  const actualKeys = new Set(
    existing.map((doc) => String((doc as { Task_Key?: string }).Task_Key ?? "").trim()),
  );
  const keysMatch =
    expectedKeys.size === actualKeys.size &&
    [...expectedKeys].every((key) => actualKeys.has(key));

  if (existing.length > 0 && !keysMatch) {
    await ganttTasks.deleteMany({ Config_ID: configId });
  } else if (existing.length > 0) {
    return 0;
  }

  const stackBySection = new Map<string, number>();
  const docs = seed.map((row) => {
    const section = row.section;
    const next = (stackBySection.get(section) ?? 0) + 1;
    stackBySection.set(section, next);
    return mongoDocFromGanttSeed(configId, row, next);
  });
  if (docs.length === 0) return 0;
  await ganttTasks.insertMany(docs);
  return docs.length;
}

export async function seedGanttTasksForConfig(
  configId: string,
  planOptionId: PlanOptionId = "12_week",
): Promise<number> {
  return ensureGanttTasksSeeded(configId, planOptionId);
}

export async function patchGanttTasks(
  configId: string,
  updates: Array<{
    Tile_ID: string;
    Start_Week?: number;
    Span_Weeks?: number;
    Notes?: string;
    Title?: string;
    Description?: string;
    Attendees?: string;
    Agenda_Outcomes?: string;
    Related_Tasks?: string;
    Level_Of_Effort?: string;
  }>,
): Promise<void> {
  const { ganttTasks } = await getMongoCollections();
  for (const u of updates) {
    const tileId = u.Tile_ID.trim();
    if (!tileId) continue;
    const $set: Record<string, unknown> = {};
    if (u.Start_Week !== undefined) $set.Start_Week = Math.max(1, Math.round(u.Start_Week));
    if (u.Span_Weeks !== undefined) $set.Span_Weeks = Math.max(1, Math.round(u.Span_Weeks));
    if (u.Notes !== undefined) $set.Notes = u.Notes;
    if (u.Title !== undefined) $set.Title = u.Title;
    if (u.Description !== undefined) $set.Description = u.Description;
    if (u.Attendees !== undefined) $set.Attendees = u.Attendees;
    if (u.Agenda_Outcomes !== undefined) $set.Agenda_Outcomes = u.Agenda_Outcomes;
    if (u.Related_Tasks !== undefined) $set.Related_Tasks = u.Related_Tasks;
    if (u.Level_Of_Effort !== undefined) $set.Level_Of_Effort = u.Level_Of_Effort;
    if (!Object.keys($set).length) continue;
    await ganttTasks.updateOne({ Config_ID: configId, Tile_ID: tileId }, { $set });
  }
}

export async function deleteGanttTaskByRowId(configId: string, rowId: string): Promise<boolean> {
  const { ganttTasks } = await getMongoCollections();
  const doc = await ganttTasks.findOne({ Config_ID: configId, ID: rowId });
  const target =
    doc ??
    (await ganttTasks.findOne({
      Config_ID: configId,
      Tile_ID: rowId.includes("__") ? rowId.split("__").pop() : rowId,
    }));
  if (!target) return false;
  if (normalizeOptional(target.Optional) !== "Y") {
    throw new Error("Required plan tasks cannot be removed.");
  }
  await ganttTasks.deleteOne({ _id: target._id });
  return true;
}
