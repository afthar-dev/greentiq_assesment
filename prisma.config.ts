import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 moved connection URLs out of schema.prisma.
 *
 * Migrations run against DIRECT_URL because PgBouncer cannot execute the DDL
 * and advisory locks Prisma Migrate needs. Runtime queries use the pooled
 * DATABASE_URL via the adapter in src/lib/prisma.ts.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
