import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma 7 requires an explicit driver adapter. This points at Neon's pooled
 * endpoint so serverless invocations reuse PgBouncer connections rather than
 * opening a new Postgres connection per request. Migrations use DIRECT_URL
 * instead — see prisma.config.ts.
 */
const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Database connection failed");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
