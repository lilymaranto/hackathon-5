import {
  deleteConfigOnly,
  deleteTilesByKeys,
  fetchConfigById,
  fetchTileDeleteKeysForConfig,
  patchConfig,
} from "@/lib/caboodle";
import { parsePlanOptionId } from "@/lib/constants";
import { IndustryType, ProductType } from "@/lib/types";
import { after, NextRequest, NextResponse } from "next/server";

/** Slow-google-sheet deletes (paced retries); avoids premature timeouts on hosts like Vercel. */
export const maxDuration = 300;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ configId: string }> },
) {
  try {
    const { configId } = await params;
    const config = await fetchConfigById(configId);
    return NextResponse.json({ data: config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> },
) {
  try {
    const { configId } = await params;
    const body = (await request.json()) as {
      title?: string;
      productType?: ProductType;
      planOptionId?: string;
      industry?: IndustryType;
      password?: string;
      handoffDocUrl?: string;
    };

    const planOptionResolved =
      body.planOptionId !== undefined ? parsePlanOptionId(body.planOptionId) : undefined;

    await patchConfig(configId, {
      Title: body.title,
      Product_Type: body.productType,
      Industry: body.industry,
      Password: body.password,
      ...(planOptionResolved ? { planOptionId: planOptionResolved } : {}),
      ...(body.handoffDocUrl !== undefined ? { handoffDocUrl: body.handoffDocUrl } : {}),
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ configId: string }> },
) {
  try {
    const { configId } = await params;
    const tileRowKeys = await fetchTileDeleteKeysForConfig(configId);
    console.log("[configs.delete] deleting config and queueing tile cleanup", {
      configId,
      queuedTileDeletes: tileRowKeys.length,
      tileRowIds: tileRowKeys,
    });
    await deleteConfigOnly(configId);

    after(async () => {
      try {
        console.log("[configs.delete] background tile cleanup starting", {
          configId,
          queuedTileDeletes: tileRowKeys.length,
        });
        await deleteTilesByKeys(configId, tileRowKeys);
        console.log("[configs.delete] background tile cleanup complete", {
          configId,
          attemptedTileDeletes: tileRowKeys.length,
        });
      } catch (error) {
        console.error(
          "[configs.delete] Background tile cleanup failed",
          configId,
          error instanceof Error ? error.message : error,
        );
      }
    });

    return NextResponse.json({ data: { ok: true, queuedTileDeletes: tileRowKeys.length } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
