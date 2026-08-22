import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { isEmailAllowed } from "@/lib/auth-allowlist"
import { auth } from "@/lib/auth"

/**
 * Authoritative, server-side session check.
 *
 * The middleware only inspects the session cookie, which is fast but
 * optimistic — a cookie's presence is not proof of a valid session. Every
 * protected page and API route calls through here for the real verification.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/**
 * Returns the session or redirects to /login.
 *
 * The allowlist is re-checked on every request rather than trusted from
 * sign-in time: without this, removing an address from AUTH_ALLOWED_EMAILS
 * would not take effect until that user's existing session expired.
 */
export async function requireSession() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (!isEmailAllowed(session.user.email)) {
    redirect("/login?error=email_not_allowed")
  }

  return session
}

/**
 * API-route counterpart to requireSession: returns null instead of
 * redirecting, so handlers can answer with a 401 JSON body.
 */
export async function getAuthorizedSession() {
  const session = await getSession()

  if (!session || !isEmailAllowed(session.user.email)) {
    return null
  }

  return session
}
