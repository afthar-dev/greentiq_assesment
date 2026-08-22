import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"

/**
 * Prisma 7 requires an explicit driver adapter. We point it at Neon's pooled
 * endpoint (DATABASE_URL) so serverless invocations reuse PgBouncer
 * connections instead of opening a new Postgres connection per request.
 *
 * The client is cached on globalThis so Next.js dev hot-reloads do not leak a
 * new connection pool on every file change.
 */
const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill in your Neon connection strings."
    )
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
