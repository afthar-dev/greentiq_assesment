/**
 * Email allowlist policy.
 *
 * The app is deployed publicly with a live database behind it, so OAuth alone
 * is not an authorization decision: anyone with a Google account can complete
 * a Google sign-in. This module decides *which* authenticated identities are
 * actually allowed in.
 *
 * Configured via AUTH_ALLOWED_EMAILS, a comma-separated list accepting either
 * form:
 *   - an exact address        alice@example.com
 *   - a whole domain          @example.com
 *
 * Fails closed: if the variable is missing or empty, nobody is allowed in.
 * An open-by-default auth system is the kind of mistake that is invisible
 * until it matters, so the safe direction is to lock everyone out (loudly)
 * rather than let everyone in (silently).
 */

export const ALLOWLIST_ENV_VAR = "AUTH_ALLOWED_EMAILS"

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return []

  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

/** The configured entries, for diagnostics and startup warnings. */
export function getAllowlist(): string[] {
  return parseAllowlist(process.env[ALLOWLIST_ENV_VAR])
}

/**
 * Returns true when `email` is permitted to use the app.
 *
 * Matching is case-insensitive. A `@domain.com` entry matches any address at
 * that domain; anything else must match the full address exactly.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false

  const allowlist = getAllowlist()
  if (allowlist.length === 0) return false

  const normalized = email.trim().toLowerCase()
  if (!normalized.includes("@")) return false

  const domain = normalized.slice(normalized.lastIndexOf("@"))

  return allowlist.some((entry) =>
    entry.startsWith("@") ? entry === domain : entry === normalized
  )
}
