import type { CustomerStatus } from "@/generated/prisma/client";

/**
 * Badge styling per status, shared by the table and the detail modal so the
 * same status cannot end up a different colour in two places.
 */
export const STATUS_STYLES: Record<CustomerStatus, string> = {
  ACTIVE_CUSTOMER:
    "border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  PROSPECT:
    "border-transparent bg-blue-500/12 text-blue-700 dark:text-blue-400",
  LEAD: "border-transparent bg-amber-500/14 text-amber-700 dark:text-amber-400",
  INACTIVE_CUSTOMER:
    "border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-400",
  ARCHIVED: "border-transparent bg-muted text-muted-foreground",
};
