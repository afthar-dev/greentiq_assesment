import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isEmailAllowed } from "@/features/auth/lib/allowlist";
import { auth } from "@/features/auth/lib/auth";

/**
 * Authoritative session checks.
 */

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Redirects to /login when unauthenticated. For pages. */
export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!isEmailAllowed(session.user.email)) {
    redirect("/login?error=email_not_allowed");
  }

  return session;
}

/** Returns null instead of redirecting, so handlers can answer 401. */
export async function getAuthorizedSession() {
  const session = await getSession();

  if (!session || !isEmailAllowed(session.user.email)) {
    return null;
  }

  return session;
}
