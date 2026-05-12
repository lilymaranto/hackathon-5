import { authOptions } from "@/lib/auth-options";
import { createConfigWithSeed, fetchConfigs } from "@/lib/caboodle";
import { parsePlanOptionId } from "@/lib/constants";
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

    const created = await createConfigWithSeed({
      title: body.title,
      productType: body.productType,
      industry: body.industry,
      planOptionId,
      password: body.password,
      createdBy: creatorEmail,
      channels,
    });

    return NextResponse.json({ data: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
