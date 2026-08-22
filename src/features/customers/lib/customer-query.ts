import type { Prisma } from "@/generated/prisma/client";

import type { CustomerQuery } from "@/features/customers/schemas/customer-query";

/**
 * Turns a validated query into Prisma arguments.
 *
 * No database access in here, so the filter logic can be tested on its own.
 * Conditions are pushed into a single AND, which is what makes search and the
 * five filters narrow together instead of overriding each other.
 */
export function buildCustomerWhere(
  query: CustomerQuery,
): Prisma.CustomerWhereInput {
  const conditions: Prisma.CustomerWhereInput[] = [];

  if (query.q) {
    conditions.push({
      OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { company: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }

  if (query.status.length > 0) {
    conditions.push({ status: { in: query.status } });
  }

  if (query.company.length > 0) {
    conditions.push({ company: { in: query.company } });
  }

  // Postgres compares timestamps, so `dateTo` is pushed to the end of that day
  // — otherwise a customer contacted at 14:00 is excluded from a range whose
  // upper bound is the same date at midnight.
  //
  // The boundary is computed in UTC because the date strings parse as UTC
  // midnight. Using local hours here would shift the upper bound by the
  // server's offset and silently drop rows near the edge of the range.
  if (query.dateFrom || query.dateTo) {
    const lastContactAt: Prisma.DateTimeNullableFilter = {};

    if (query.dateFrom) {
      lastContactAt.gte = query.dateFrom;
    }

    if (query.dateTo) {
      const endOfDay = new Date(query.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      lastContactAt.lte = endOfDay;
    }

    conditions.push({ lastContactAt });
  }

  if (query.phone) {
    conditions.push({ phone: { contains: query.phone, mode: "insensitive" } });
  }

  if (query.email) {
    conditions.push({ email: { contains: query.email, mode: "insensitive" } });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export function buildCustomerOrderBy(
  query: CustomerQuery,
): Prisma.CustomerOrderByWithRelationInput[] {
  // lastContactAt is nullable, and Postgres puts NULLs first on DESC — which
  // would open "newest contact" with every customer who has never been
  // contacted. Pinning nulls last keeps both directions matching their label.
  const primary: Prisma.CustomerOrderByWithRelationInput =
    query.sortBy === "lastContactAt"
      ? { lastContactAt: { sort: query.sortDir, nulls: "last" } }
      : { [query.sortBy]: query.sortDir };

  // `id` breaks ties so paging is stable: without it, rows sharing a sort
  // value can be returned in a different order per page and a record can
  // appear twice or not at all.
  return [primary, { id: "asc" }];
}

export function buildCustomerPagination(query: CustomerQuery) {
  return {
    skip: (query.page - 1) * query.pageSize,
    take: query.pageSize,
  };
}
