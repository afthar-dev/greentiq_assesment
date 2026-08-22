import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Route gate. Next.js 16 renamed `middleware` to `proxy`: this file must be
 * src/proxy.ts and export a function named `proxy`.
 *
 * Optimistic by design — it only asks whether a session cookie is present,
 * which is cheap enough for every request but is not proof of a valid session.
 * requireSession() in src/lib/auth-guard.ts is the real boundary.
 */
const PUBLIC_ROUTES = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isPublicRoute) {
    return hasSessionCookie
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);

    // Preserve the intended destination so login can return them to it.
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackURL", `${pathname}${search}`);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // /api/auth/* must stay reachable, or the OAuth callback would be
  // redirected to /login and sign-in could never complete.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
