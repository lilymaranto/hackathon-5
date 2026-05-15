import { authOptions } from "@/lib/auth-options";
import { createConfigWithSeed, fetchConfigs } from "@/lib/caboodle";
import { parsePlanOptionId } from "@/lib/constants";
import { parseHexColorOptional } from "@/lib/tile-category-colors";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const mineOnly = request.nextUrl.searchParams.get("mine") === "1";

    let data = await fetchConfigs(search);

    if (mineOnly) {
      const email = session?.user?.email?.trim();
      if (!email) {
        return NextResponse.json({ error: "Sign in to filter by your configs." }, { status: 401 });
      }
      const needle = normalizeEmail(email);
      data = data.filter((row) => normalizeEmail(row.Created_By ?? "") === needle);
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const creatorEmail = session?.user?.email?.trim();
    if (!creatorEmail) {
      return NextResponse.json({ error: "Sign in to create a config." }, { status: 401 });
    }

    const body = (await request.json()) as {
      title: string;
      productType: "Braze Core" | "AI Decisioning Studio";
      industry:
        | "Retail & eCommerce"
        | "QSR"
        | "Media, Gaming, and Entertainment"
        | "Financial Services"
        | "Healthcare & Life Sciences"
        | "Other";
      planOptionId?: string;
      password?: string;
      onboardingSessionTileColor?: string;
      customerActivityTileColor?: string;
      buttonColor?: string;
      workstreamGradientTopColor?: string;
      workstreamGradientBottomColor?: string;
      logoDataUrl?: string;
      channels?: {
        email?: boolean;
        sms?: boolean;
        whatsapp?: boolean;
        inProductMessaging?: boolean;
      };
    };

    const channels = {
      email: body.channels?.email ?? true,
      sms: body.channels?.sms ?? true,
      whatsapp: body.channels?.whatsapp ?? true,
      inProductMessaging: body.channels?.inProductMessaging ?? false,
    };

    const parsedPlan = parsePlanOptionId(body.planOptionId);
    if (
      parsedPlan === null &&
      body.planOptionId !== undefined &&
      body.planOptionId !== null &&
      String(body.planOptionId).trim() !== ""
    ) {
      return NextResponse.json(
        {
          error: `Invalid plan package "${String(body.planOptionId)}". Expected a slug such as ignite_gold or quickstart_gold.`,
        },
        { status: 400 },
      );
    }
    const planOptionId =
      body.productType === "AI Decisioning Studio"
        ? "ai_decisioning_studio"
        : parsedPlan ?? "12_week";

    const ob = body.onboardingSessionTileColor?.trim() ?? "";
    const cb = body.customerActivityTileColor?.trim() ?? "";
    const btnRaw = body.buttonColor?.trim() ?? "";
    const buttonHex = btnRaw ? parseHexColorOptional(btnRaw) : undefined;
    if (btnRaw && !buttonHex) {
      return NextResponse.json(
        { error: "Invalid buttonColor: use hex like #801ed7." },
        { status: 400 },
      );
    }

    const onboardingHex = ob ? parseHexColorOptional(ob) : undefined;
    const customerHex = cb ? parseHexColorOptional(cb) : undefined;
    if (ob && !onboardingHex) {
      return NextResponse.json(
        { error: "Invalid onboardingSessionTileColor: use hex like #300266." },
        { status: 400 },
      );
    }
    if (cb && !customerHex) {
      return NextResponse.json(
        { error: "Invalid customerActivityTileColor: use hex like #c9c4ef." },
        { status: 400 },
      );
    }

    const wst = body.workstreamGradientTopColor?.trim() ?? "";
    const wsb = body.workstreamGradientBottomColor?.trim() ?? "";
    const wsTopHex = wst ? parseHexColorOptional(wst) : undefined;
    const wsBottomHex = wsb ? parseHexColorOptional(wsb) : undefined;
    if (wst && !wsTopHex) {
      return NextResponse.json(
        { error: "Invalid workstreamGradientTopColor: use hex like #300266." },
        { status: 400 },
      );
    }
    if (wsb && !wsBottomHex) {
      return NextResponse.json(
        { error: "Invalid workstreamGradientBottomColor: use hex like #801ed7." },
        { status: 400 },
      );
    }

    const created = await createConfigWithSeed({
      title: body.title,
      productType: body.productType,
      industry: body.industry,
      planOptionId,
      password: body.password,
      createdBy: creatorEmail,
      channels,
      ...(onboardingHex ? { onboardingSessionTileColor: onboardingHex } : {}),
      ...(customerHex ? { customerActivityTileColor: customerHex } : {}),
      ...(buttonHex ? { buttonColor: buttonHex } : {}),
      ...(wsTopHex ? { workstreamGradientTopColor: wsTopHex } : {}),
      ...(wsBottomHex ? { workstreamGradientBottomColor: wsBottomHex } : {}),
      ...(body.logoDataUrl !== undefined ? { logoDataUrl: body.logoDataUrl } : {}),
    });

    return NextResponse.json({ data: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
