export const ALLOWLIST_ENV_VAR = "AUTH_ALLOWED_EMAILS";
export const ALLOW_ALL_ENV_VAR = "ISALLOWAUTH";

/** True only for an explicit opt-in value, so a typo keeps the gate shut. */
export function isOpenSignupEnabled(): boolean {
  const value = process.env[ALLOW_ALL_ENV_VAR]?.trim().toLowerCase();
  return value === "true" || value === "1";
}

export function getAllowlist(): string[] {
  return (process.env[ALLOWLIST_ENV_VAR] ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;

  const normalized = email.trim().toLowerCase();

  if (!normalized.includes("@")) return false;

  if (isOpenSignupEnabled()) return true;

  const allowlist = getAllowlist();
  if (allowlist.length === 0) return false;

  const domain = normalized.slice(normalized.lastIndexOf("@"));

  return allowlist.some((entry) =>
    entry.startsWith("@") ? entry === domain : entry === normalized,
  );
}
