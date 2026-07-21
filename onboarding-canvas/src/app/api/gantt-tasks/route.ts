import {
  deleteGanttTaskByRowId,
  ensureGanttTasksSeeded,
  fetchGanttTasks,
  patchGanttTasks,
} from "@/lib/mongo-gantt-tasks";
import { usesPlanTaskGantt } from "@/lib/enterprise-platinum-gantt";
import { fetchConfigById } from "@/lib/caboodle";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const configId = request.nextUrl.searchParams.get("configId");
  if (!configId) {
    return NextResponse.json({ error: "configId is required." }, { status: 400 });
  }

  try {
    const config = await fetchConfigById(configId);
    if (!config || !usesPlanTaskGantt(config.planOptionId)) {
      return NextResponse.json({ data: [] });
    }
    await ensureGanttTasksSeeded(configId, config.planOptionId);
    const data = await fetchGanttTasks(configId);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      configId?: string;
      updates?: Array<{
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
      }>;
    };

    const configId = body.configId?.trim();
    if (!configId) {
      return NextResponse.json({ error: "configId is required." }, { status: 400 });
    }
    const updates = body.updates ?? [];
    if (!updates.length) {
      return NextResponse.json({ data: { updated: 0 } });
    }

    await patchGanttTasks(configId, updates);
    return NextResponse.json({ data: { updated: updates.length } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const configId = request.nextUrl.searchParams.get("configId");
  const rowId = request.nextUrl.searchParams.get("id");
  if (!configId || !rowId) {
    return NextResponse.json({ error: "configId and id are required." }, { status: 400 });
  }

  try {
    const deleted = await deleteGanttTaskByRowId(configId, rowId);
    if (!deleted) {
      return NextResponse.json({ error: "Gantt task not found." }, { status: 404 });
    }
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
