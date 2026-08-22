import { createAuthClient } from "better-auth/react";

// baseURL is unset so it resolves against the current origin, which keeps
// local, preview and production deployments working unconfigured.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
