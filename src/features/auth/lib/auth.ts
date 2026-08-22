import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import {
  ALLOW_ALL_ENV_VAR,
  ALLOWLIST_ENV_VAR,
  getAllowlist,
  isEmailAllowed,
  isOpenSignupEnabled,
} from "@/features/auth/lib/allowlist";
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

// Both modes are easy to misconfigure in ways that only show up mid-OAuth,
// so say which one is active at boot.
if (isOpenSignupEnabled()) {
  console.warn(
    `[auth] ${ALLOW_ALL_ENV_VAR} is on — any Google account can sign in.`,
  );
} else if (
  process.env.NODE_ENV !== "production" &&
  getAllowlist().length === 0
) {
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
