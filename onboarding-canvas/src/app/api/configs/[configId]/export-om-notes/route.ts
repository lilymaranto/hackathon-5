import { authOptions } from "@/lib/auth-options";
import { fetchConfigById, fetchTiles, patchConfig } from "@/lib/caboodle";
import { googleAccessTokenFromJwt } from "@/lib/google-oauth-token";
import {
  buildOmExportSections,
  shouldExportOmTile,
  sortTilesForOmExport,
} from "@/lib/om-handoff-export";
import { createOmHandoffGoogleDoc } from "@/lib/om-handoff-google-doc";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

function authSecret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be set for sign-in.");
  return s;
}

function isBrazeEmployeeEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith("@braze.com");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!session?.user || !isBrazeEmployeeEmail(email)) {
      return NextResponse.json({ error: "Sign in with your Braze Google account." }, { status: 401 });
    }
    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { error: "Google session expired. Sign in again to continue." },
        { status: 401 },
      );
    }

    const jwt = await getToken({
      req: request,
      secret: authSecret(),
    });

    const { configId } = await params;
    const config = await fetchConfigById(configId);
    if (!config) {
      return NextResponse.json({ error: "Config not found." }, { status: 404 });
    }

    const tiles = await fetchTiles(configId);
    const filtered = sortTilesForOmExport(tiles.filter(shouldExportOmTile));
    if (!filtered.length) {
      return NextResponse.json(
        { error: "No tiles to export. Add notes, descriptions, or custom tiles first." },
        { status: 400 },
      );
    }

    const sections = filtered.flatMap((tile, i) => {
      const block = buildOmExportSections(config, tile);
      if (i > 0) {
        return [{ kind: "body" as const, text: "" }, ...block];
      }
      return block;
    });

    const accessToken =
      session.accessToken ??
      (await googleAccessTokenFromJwt({
        access_token: jwt?.access_token as string | undefined,
        refresh_token: jwt?.refresh_token as string | undefined,
        expires_at: jwt?.expires_at as number | undefined,
      }));

    const docTitle = `${config.Title} - Onboarding Hand-off Notes`;
    const { url } = await createOmHandoffGoogleDoc({
      documentTitle: docTitle,
      sections,
      accessToken,
    });

    await patchConfig(configId, { handoffDocUrl: url });

    return NextResponse.json({ data: { url, title: docTitle } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed." },
      { status: 500 },
    );
  }
}
