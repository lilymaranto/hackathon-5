import { withAuth } from "next-auth/middleware";

/**
 * Run auth before App Router renders `/employee/configs/*`.
 * Avoids `redirect()` inside those RSC pages, which in Next 16 + Turbopack dev can
 * trigger `performance.measure` negative timestamp errors (next.js#86060).
 */
export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/employee/signin",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
});

export const config = {
  matcher: ["/employee/configs", "/employee/configs/:path*"],
};
