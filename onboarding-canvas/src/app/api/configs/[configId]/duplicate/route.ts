import { authOptions } from "@/lib/auth-options";
import { duplicateConfig } from "@/lib/caboodle";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ configId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const creatorEmail = session?.user?.email?.trim();
    if (!creatorEmail) {
      return NextResponse.json({ error: "Sign in to duplicate a config." }, { status: 401 });
    }

    const { configId } = await params;
    const id = configId?.trim();
    if (!id) {
      return NextResponse.json({ error: "configId is required." }, { status: 400 });
    }

    const created = await duplicateConfig(id, creatorEmail);
    return NextResponse.json({ data: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
