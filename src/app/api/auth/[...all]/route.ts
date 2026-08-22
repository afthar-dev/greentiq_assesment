import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth"

/**
 * Mounts every Better Auth endpoint (sign-in, OAuth callback, sign-out,
 * session) under /api/auth/*.
 */
export const { GET, POST } = toNextJsHandler(auth.handler)
