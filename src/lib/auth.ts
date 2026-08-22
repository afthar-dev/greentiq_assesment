import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"

import { ALLOWLIST_ENV_VAR, getAllowlist, isEmailAllowed } from "@/lib/auth-allowlist"
import { prisma } from "@/lib/prisma"

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill it in — see README for the Google OAuth setup steps.`
    )
  }

  return value
}

// Surfaced once at boot rather than as a confusing "access denied" during the
// OAuth round trip, since an empty allowlist locks out every account.
if (process.env.NODE_ENV !== "production" && getAllowlist().length === 0) {
  console.warn(
    `[auth] ${ALLOWLIST_ENV_VAR} is empty — all sign-ins will be rejected. Add your Google account email to .env.`
  )
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: requireEnv("BETTER_AUTH_SECRET"),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  socialProviders: {
    google: {
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the expiry at most once a day
    cookieCache: {
      // Lets middleware read session state without a database round trip.
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  user: {
    /**
     * The authorization gate. Runs for `create-user`, `link-account` and —
     * because this app is OAuth-only — every `sign-in`, so revoking access is
     * a matter of removing the address from AUTH_ALLOWED_EMAILS.
     *
     * Returning `{ error }` rejects: browser flows land back on the login page
     * with the code in the query string.
     */
    validateUserInfo: ({ user }) => {
      if (!isEmailAllowed(user.email)) {
        return {
          error: "email_not_allowed",
          errorDescription:
            "This account is not authorised to access this dashboard.",
        }
      }
    },
  },

  account: {
    accountLinking: {
      // Only Google is configured, and Google verifies its own addresses.
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  advanced: {
    // Cookies are only sent over HTTPS once deployed.
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  // Must stay last: lets server actions and route handlers set auth cookies.
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
