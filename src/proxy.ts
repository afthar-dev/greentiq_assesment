import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Edge-level gate for the dashboard.
 *
 * This is an *optimistic* check: it only asks whether a session cookie is
 * present, which is cheap enough to run on every request but is not proof of a
 * valid session (a stale or forged cookie passes here). The authoritative
 * verification lives in requireSession() on the server, which validates the
 * session against the database and re-applies the email allowlist.
 *
 * Splitting it this way keeps the common case fast without making the cookie
 * a security boundary.
 */
const PUBLIC_ROUTES = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Signed-in users have no reason to see the login screen.
  if (isPublicRoute) {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);

    // Preserve where they were heading so login can send them back.
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackURL", `${pathname}${search}`);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Everything except Next internals, static assets, and the auth endpoints
   * themselves — /api/auth/* must stay reachable or the OAuth callback would
   * be redirected to /login and sign-in could never complete.
   */
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
