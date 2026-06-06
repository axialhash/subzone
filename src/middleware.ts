import { auth } from "@/lib/auth";

/**
 * Middleware for NextAuth v5.
 * Uses the SHARED auth config from lib/auth.ts (with PrismaAdapter,
 * database sessions, callbacks, etc.) — not a separate instance.
 *
 * Protects /dashboard and /admin routes — unauthenticated users
 * get redirected to /login.
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnAdmin = req.nextUrl.pathname.startsWith("/admin");

  if ((isOnDashboard || isOnAdmin) && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
