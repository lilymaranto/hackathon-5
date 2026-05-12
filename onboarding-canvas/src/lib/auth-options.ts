import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const googleOAuthScopes = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "missing-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "missing-google-client-secret",
      authorization: {
        params: {
          scope: googleOAuthScopes,
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      return !!email && email.endsWith("@braze.com");
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        if (url === "/" || url.startsWith("/api/auth/signin")) {
          return `${baseUrl}/employee/configs`;
        }
        return `${baseUrl}${url}`;
      }

      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (target.origin === base.origin) {
          if (target.pathname === "/" || target.pathname.startsWith("/api/auth/signin")) {
            return `${baseUrl}/employee/configs`;
          }
          return url;
        }
      } catch {
        // Fall through to default safe redirect.
      }

      return `${baseUrl}/employee/configs`;
    },
    async jwt({ token, account }) {
      if (account) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
        token.expires_at = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.access_token as string | undefined;
      session.error = token.error as string | undefined;
      return session;
    },
  },
};
