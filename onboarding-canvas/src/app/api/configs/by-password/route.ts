import { fetchConfigByPassword } from "@/lib/caboodle";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get("password");
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  try {
    const config = await fetchConfigByPassword(password);
    return NextResponse.json({ data: config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
