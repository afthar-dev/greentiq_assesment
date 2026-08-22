import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import {
  ALLOWLIST_ENV_VAR,
  getAllowlist,
  isEmailAllowed,
} from "@/lib/auth-allowlist";
import { prisma } from "@/lib/prisma";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill it in — see the README for the Google OAuth setup steps.`,
    );
  }

  return value;
}

// An empty allowlist locks out every account, so say so at boot rather than
// as an opaque "access denied" mid-OAuth.
if (process.env.NODE_ENV !== "production" && getAllowlist().length === 0) {
  console.warn(
    `[auth] ${ALLOWLIST_ENV_VAR} is empty — all sign-ins will be rejected.`,
  );
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
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // Lets the proxy read session state without a database round trip.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  user: {
    /**
     * Authorisation gate. Because this app is OAuth-only it runs on every
     * sign-in, not just first registration, so removing an address from the
     * allowlist revokes access immediately.
     */
    validateUserInfo: ({ user }) => {
      if (!isEmailAllowed(user.email)) {
        return {
          error: "email_not_allowed",
          errorDescription:
            "This account is not authorised to access this dashboard.",
        };
      }
    },
  },

  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  // Must stay last: lets route handlers and server actions set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
