import type { CustomerQueryInput } from "@/lib/validations/customer-query";

/**
 * Query key factory.
 *
 * Centralised so invalidation cannot drift from the keys it is meant to
 * match: `customerKeys.all` invalidates every list and detail at once, while
 * a single list key stays specific to its filters.
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
