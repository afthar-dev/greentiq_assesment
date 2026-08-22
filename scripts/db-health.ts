import "dotenv/config"

import { prisma } from "../src/lib/prisma"

/**
 * Verifies the runtime database path: the pooled DATABASE_URL going through
 * the Prisma driver adapter. `prisma migrate` uses DIRECT_URL instead, so a
 * successful migration does not by itself prove the app can reach the database.
 */
async function main() {
  const startedAt = Date.now()

  const [meta] = await prisma.$queryRaw<
    { db: string; user: string; version: string }[]
  >`SELECT current_database() AS db, current_user AS user, version() AS version`

  const latencyMs = Date.now() - startedAt

  // Confirms the generated client and the actual tables agree.
  const [customers, savedFilters] = await Promise.all([
    prisma.customer.count(),
    prisma.savedFilter.count(),
  ])

  const host = new URL(process.env.DATABASE_URL!).host

  console.log("Database health check")
  console.log("---------------------")
  console.log(`  status        : CONNECTED`)
  console.log(`  host          : ${host}`)
  console.log(`  pooled        : ${host.includes("-pooler") ? "yes" : "no"}`)
  console.log(`  database      : ${meta.db}`)
  console.log(`  user          : ${meta.user}`)
  console.log(`  server        : ${meta.version.split(" ").slice(0, 2).join(" ")}`)
  console.log(`  latency       : ${latencyMs}ms`)
  console.log(`  customers     : ${customers}`)
  console.log(`  saved filters : ${savedFilters}`)
}

main()
  .catch((error) => {
    console.error("Database health check FAILED")
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
