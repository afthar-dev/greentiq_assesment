import type { CustomerQueryInput } from "@/features/customers/schemas/customer-query";

/**
 * Query keys in one place, so invalidation can't drift from the keys it's
 * meant to match. `all` clears every list and detail at once; `list(query)`
 * stays specific to its filters.
 */
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (query: CustomerQueryInput) =>
    [...customerKeys.lists(), query] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  companies: () => [...customerKeys.all, "companies"] as const,
  stats: () => [...customerKeys.all, "stats"] as const,
  savedFilters: () => ["saved-filters"] as const,
};
