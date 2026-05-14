import {
  deleteConfigOnly,
  deleteTilesByKeys,
  fetchConfigById,
  fetchTileDeleteKeysForConfig,
  patchConfig,
} from "@/lib/caboodle";
import { parsePlanOptionId, WORKSTREAMS } from "@/lib/constants";
import {
  normalizeBrazeCoreWorkstreamOrder,
  type BrazeWorkstreamOrderEntry,
} from "@/lib/braze-workstream-order";
import { parseHexColorOptional } from "@/lib/tile-category-colors";
import { parseTimelineAnnotationField, type TimelineAnnotationDocument } from "@/lib/timeline-annotations";
import { IndustryType, ProductType, Workstream } from "@/lib/types";
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
    const body = (await request.json()) as Record<string, unknown> & {
      title?: string;
      chosenTitle?: string;
      productType?: ProductType;
      planOptionId?: string;
      industry?: IndustryType;
      password?: string;
      handoffDocUrl?: string;
      onboardingSessionTileColor?: string;
      customerActivityTileColor?: string;
      buttonColor?: string;
      workstreamGradientTopColor?: string;
      workstreamGradientBottomColor?: string;
      brazeCoreWorkstreamOrder?: BrazeWorkstreamOrderEntry[] | Workstream[];
      timelineAnnotation?: TimelineAnnotationDocument | unknown;
      TimelineAnnotation?: TimelineAnnotationDocument | string | unknown;
    };

    const hasWsOrderKey = Object.prototype.hasOwnProperty.call(body, "brazeCoreWorkstreamOrder");
    const hasChosenTitleKey = Object.prototype.hasOwnProperty.call(body, "chosenTitle");
    const hasTimelineCamel =
      Object.prototype.hasOwnProperty.call(body, "timelineAnnotation") &&
      body.timelineAnnotation !== undefined;
    const hasTimelinePascal =
      Object.prototype.hasOwnProperty.call(body, "TimelineAnnotation") &&
      body.TimelineAnnotation !== undefined;
    const hasTimelineAnnotationKey = hasTimelineCamel || hasTimelinePascal;
    const timelineAnnotationPatch: TimelineAnnotationDocument | undefined = hasTimelineAnnotationKey
      ? parseTimelineAnnotationField(hasTimelineCamel ? body.timelineAnnotation : body.TimelineAnnotation)
      : undefined;

    const planOptionResolved =
      body.planOptionId !== undefined ? parsePlanOptionId(body.planOptionId) : undefined;

    const ob = body.onboardingSessionTileColor?.trim() ?? "";
    const cb = body.customerActivityTileColor?.trim() ?? "";
    const hasOnboardingKey = Object.prototype.hasOwnProperty.call(body, "onboardingSessionTileColor");
    const hasCustomerKey = Object.prototype.hasOwnProperty.call(body, "customerActivityTileColor");
    const hasButtonKey = Object.prototype.hasOwnProperty.call(body, "buttonColor");
    const hasWsTopKey = Object.prototype.hasOwnProperty.call(body, "workstreamGradientTopColor");
    const hasWsBottomKey = Object.prototype.hasOwnProperty.call(body, "workstreamGradientBottomColor");
    if (hasOnboardingKey && ob && !parseHexColorOptional(ob)) {
      return NextResponse.json(
        { error: "Invalid onboardingSessionTileColor: use hex like #300266." },
        { status: 400 },
      );
    }
    if (hasCustomerKey && cb && !parseHexColorOptional(cb)) {
      return NextResponse.json(
        { error: "Invalid customerActivityTileColor: use hex like #c9c4ef." },
        { status: 400 },
      );
    }

    const btn = body.buttonColor?.trim() ?? "";
    if (hasButtonKey && btn && !parseHexColorOptional(btn)) {
      return NextResponse.json(
        { error: "Invalid buttonColor: use hex like #801ed7." },
        { status: 400 },
      );
    }

    const wst = body.workstreamGradientTopColor?.trim() ?? "";
    const wsb = body.workstreamGradientBottomColor?.trim() ?? "";
    if (hasWsTopKey && wst && !parseHexColorOptional(wst)) {
      return NextResponse.json(
        { error: "Invalid workstreamGradientTopColor: use hex like #300266." },
        { status: 400 },
      );
    }
    if (hasWsBottomKey && wsb && !parseHexColorOptional(wsb)) {
      return NextResponse.json(
        { error: "Invalid workstreamGradientBottomColor: use hex like #801ed7." },
        { status: 400 },
      );
    }

    await patchConfig(configId, {
      Title: body.title,
      ...(hasChosenTitleKey ? { chosenTitle: body.chosenTitle?.trim() ?? "" } : {}),
      Product_Type: body.productType,
      Industry: body.industry,
      Password: body.password,
      ...(planOptionResolved ? { planOptionId: planOptionResolved } : {}),
      ...(body.handoffDocUrl !== undefined ? { handoffDocUrl: body.handoffDocUrl } : {}),
      ...(hasOnboardingKey ? { onboardingSessionTileColor: ob } : {}),
      ...(hasCustomerKey ? { customerActivityTileColor: cb } : {}),
      ...(hasButtonKey ? { buttonColor: btn } : {}),
      ...(hasWsTopKey ? { workstreamGradientTopColor: wst } : {}),
      ...(hasWsBottomKey ? { workstreamGradientBottomColor: wsb } : {}),
      ...(hasWsOrderKey
        ? {
            brazeCoreWorkstreamOrder: normalizeBrazeCoreWorkstreamOrder(
              Array.isArray(body.brazeCoreWorkstreamOrder) ? body.brazeCoreWorkstreamOrder : [],
              (ws) => WORKSTREAMS.find((w) => w.id === ws)?.color ?? "#300266",
            ),
          }
        : {}),
      ...(hasTimelineAnnotationKey && timelineAnnotationPatch
        ? { timelineAnnotation: timelineAnnotationPatch }
        : {}),
    });

    const updated = await fetchConfigById(configId);
    return NextResponse.json({ data: updated ?? { ok: true } });
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
