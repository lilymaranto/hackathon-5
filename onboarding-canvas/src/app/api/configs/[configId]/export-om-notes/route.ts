import { fetchConfigById, fetchTiles, patchConfig } from "@/lib/caboodle";
import {
  buildOmExportSections,
  shouldExportOmTile,
  sortTilesForOmExport,
} from "@/lib/om-handoff-export";
import { createOmHandoffGoogleDoc } from "@/lib/om-handoff-google-doc";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function authSecret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be set for sign-in.");
  return s;
}

function isBrazeEmployeeEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith("@braze.com");
}

async function googleAccessTokenFromJwt(token: {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured.");
  }

  const expiresAtSec = typeof token.expires_at === "number" ? token.expires_at : 0;
  const expiresAtMs = expiresAtSec > 0 ? expiresAtSec * 1000 : 0;
  if (
    token.access_token &&
    (!expiresAtMs || Date.now() < expiresAtMs - 60_000)
  ) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    throw new Error(
      "Google session has no refresh token. Sign out and sign in again (consent) to enable export.",
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: token.refresh_token });
  const refreshed = await oauth2.refreshAccessToken();
  const next = refreshed.credentials.access_token;
  if (!next) throw new Error("Google did not return an access token after refresh.");
  return next;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> },
) {
  try {
    const jwt = await getToken({
      req: request,
      secret: authSecret(),
    });
    const email = jwt?.email ? String(jwt.email) : null;
    if (!jwt?.sub || !isBrazeEmployeeEmail(email)) {
      return NextResponse.json({ error: "Sign in with your Braze Google account." }, { status: 401 });
    }

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

    const accessToken = await googleAccessTokenFromJwt({
      access_token: jwt.access_token as string | undefined,
      refresh_token: jwt.refresh_token as string | undefined,
      expires_at: jwt.expires_at as number | undefined,
    });

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
