import { createTileRow, deleteTilesByKeys, fetchTiles, patchTilesLayout } from "@/lib/caboodle";
import type { TileCategory, TileRecord, Workstream } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const configId = request.nextUrl.searchParams.get("configId");
  if (!configId) {
    return NextResponse.json({ error: "configId is required." }, { status: 400 });
  }

  try {
    const data = await fetchTiles(configId);
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
        Start_Week: number;
        Workstream: Workstream;
        Notes?: string;
        Span_Weeks?: number;
        Title?: string;
        Description?: string;
        Attendees?: string;
        Resources?: string;
        Desired_Outcomes?: string;
      }>;
    };

    const configId = body.configId?.trim();
    if (!configId) {
      return NextResponse.json({ error: "configId is required for tile updates." }, { status: 400 });
    }

    const updates = body.updates ?? [];
    if (!updates.length) {
      return NextResponse.json({ data: { updated: 0 } });
    }

    await patchTilesLayout(configId, updates);
    return NextResponse.json({ data: { updated: updates.length } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      configId?: string;
      tile?: Pick<
        TileRecord,
        | "Tile_ID"
        | "Workstream"
        | "Title"
        | "Start_Week"
        | "Span_Weeks"
        | "Stack_Order"
        | "Category"
        | "Notes"
        | "Description"
      > &
        Partial<Pick<TileRecord, "Attendees" | "Resources" | "Desired_Outcomes">>;
    };

    const configId = body.configId?.trim();
    if (!configId) {
      return NextResponse.json({ error: "configId is required." }, { status: 400 });
    }
    const t = body.tile;
    if (!t?.Tile_ID?.trim() || !t.Title?.trim()) {
      return NextResponse.json({ error: "tile.Tile_ID and tile.Title are required." }, { status: 400 });
    }
    const category = String(t.Category ?? "customer_activity") as TileCategory;
    if (!["customer_activity", "onboarding_session", "milestone"].includes(category)) {
      return NextResponse.json({ error: "Invalid tile.Category." }, { status: 400 });
    }
    const ws = String(t.Workstream ?? "governance") as Workstream;

    await createTileRow(configId, {
      Tile_ID: t.Tile_ID.trim(),
      Workstream: ws,
      Title: t.Title.trim(),
      Start_Week: Math.max(1, Math.round(Number(t.Start_Week) || 1)),
      Span_Weeks: Math.max(1, Math.round(Number(t.Span_Weeks) || 1)),
      Stack_Order: Math.max(1, Math.round(Number(t.Stack_Order) || 1)),
      Category: category,
      Notes: t.Notes ?? "",
      Description: t.Description ?? "",
      Attendees: t.Attendees,
      Resources: t.Resources,
      Desired_Outcomes: t.Desired_Outcomes,
    });

    return NextResponse.json({ data: { created: true } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/** Deletes one tile row by Caboodle row id (`ID` column / composite `Config_ID__Tile_ID`). */
export async function DELETE(request: NextRequest) {
  const configId = request.nextUrl.searchParams.get("configId")?.trim();
  const rowId = request.nextUrl.searchParams.get("id")?.trim();
  if (!configId || !rowId) {
    return NextResponse.json(
      { error: "configId and id (row key) query parameters are required." },
      { status: 400 },
    );
  }

  try {
    await deleteTilesByKeys(configId, [rowId]);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
