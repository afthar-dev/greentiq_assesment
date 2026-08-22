/**
 * Email allowlist.
 *
 * OAuth proves identity, not authorisation: anyone with a Google account can
 * complete a Google sign-in. This decides which identities are let in.
 *
 * AUTH_ALLOWED_EMAILS is comma-separated and accepts either an exact address
 * (alice@example.com) or a whole domain (@example.com).
 *
 * Fails closed — an unset or empty variable rejects everyone. An
 * open-by-default auth system is invisible until it matters.
 */

export const ALLOWLIST_ENV_VAR = "AUTH_ALLOWED_EMAILS";

export function getAllowlist(): string[] {
  return (process.env[ALLOWLIST_ENV_VAR] ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;

  const allowlist = getAllowlist();
  if (allowlist.length === 0) return false;

  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;

  const domain = normalized.slice(normalized.lastIndexOf("@"));

  return allowlist.some((entry) =>
    entry.startsWith("@") ? entry === domain : entry === normalized,
  );
}
