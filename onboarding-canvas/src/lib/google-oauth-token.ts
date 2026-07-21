import type { JWT } from "next-auth/jwt";
import { google } from "googleapis";

export type GoogleOAuthJwt = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  error?: string;
};

function googleOAuthCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured.");
  }
  return { clientId, clientSecret };
}

export function googleAccessTokenStillValid(token: GoogleOAuthJwt, bufferMs = 60_000): boolean {
  const expiresAtSec = typeof token.expires_at === "number" ? token.expires_at : 0;
  const expiresAtMs = expiresAtSec > 0 ? expiresAtSec * 1000 : 0;
  return !!token.access_token && (!expiresAtMs || Date.now() < expiresAtMs - bufferMs);
}

export async function refreshGoogleAccessToken(token: JWT): Promise<JWT> {
  try {
    const { clientId, clientSecret } = googleOAuthCredentials();
    if (!token.refresh_token) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: token.refresh_token as string });
    const refreshed = await oauth2.refreshAccessToken();
    const credentials = refreshed.credentials;
    const accessToken = credentials.access_token;
    if (!accessToken) {
      return { ...token, error: "RefreshAccessTokenError" };
    }

    const expiresAt =
      credentials.expiry_date != null
        ? Math.floor(credentials.expiry_date / 1000)
        : Math.floor(Date.now() / 1000 + 3600);

    return {
      ...token,
      access_token: accessToken,
      expires_at: expiresAt,
      refresh_token: credentials.refresh_token ?? token.refresh_token,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export async function googleAccessTokenFromJwt(token: GoogleOAuthJwt): Promise<string> {
  if (googleAccessTokenStillValid(token)) {
    return token.access_token!;
  }

  if (!token.refresh_token) {
    throw new Error(
      "Google session has no refresh token. Sign out and sign in again to enable export.",
    );
  }

  const refreshed = await refreshGoogleAccessToken(token as JWT);
  if (refreshed.error || !refreshed.access_token) {
    throw new Error("Google session expired. Sign in again to continue.");
  }
  return refreshed.access_token;
}
