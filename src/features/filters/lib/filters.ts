import type { CustomerStatus } from "@/generated/prisma/client";

/** The five filter types from the brief, as the UI holds them. */
export type CustomerFilters = {
  status: CustomerStatus[];
  company: string[];
  dateFrom: string;
  dateTo: string;
  phone: string;
  email: string;
};

export const EMPTY_FILTERS: CustomerFilters = {
  status: [],
  company: [],
  dateFrom: "",
  dateTo: "",
  phone: "",
  email: "",
};

/**
 * Counts active filter *groups*, not selected values — three ticked statuses
 * is one filter to the user, not three.
 */
export function countActiveFilters(filters: CustomerFilters): number {
  return (
    (filters.status.length > 0 ? 1 : 0) +
    (filters.company.length > 0 ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    (filters.phone ? 1 : 0) +
    (filters.email ? 1 : 0)
  );
}
