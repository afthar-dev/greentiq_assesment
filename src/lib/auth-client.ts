import { createAuthClient } from "better-auth/react"

/**
 * Browser-side auth client. baseURL is left unset so it resolves relative to
 * the current origin, which keeps local, preview and production deployments
 * working without per-environment configuration.
 */
export const authClient = createAuthClient()

export const { signIn, signOut, useSession } = authClient
