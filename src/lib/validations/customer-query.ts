import { z } from "zod";

import { CustomerStatus } from "@/generated/prisma/client";

/**
 * Query parameters for the customer list: search, the five filter types from
 * the brief, sorting and pagination.
 *
 * Every field has a default, so an empty object parses into a valid "no
 * filters, page 1" query. That keeps callers from having to spell out a full
 * object just to ask for the first page.
 */

export const PAGE_SIZES = [10, 25, 50] as const;

export const SORT_FIELDS = [
  "name",
  "email",
  "company",
  "lastContactAt",
  "createdAt",
] as const;

/** Accepts a single value or a repeated one and always yields an array. */
const stringArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return [];
    const list = Array.isArray(value) ? value : value.split(",");
    return list.map((item) => item.trim()).filter(Boolean);
  });

const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .optional()
  .transform((value) => (value ? new Date(value) : null));

export const customerQuerySchema = z.object({
  /** Free-text search across name, email and company. */
  q: z.string().trim().default(""),

  status: stringArray.pipe(z.array(z.enum(CustomerStatus))),
  company: stringArray,

  dateFrom: optionalDate,
  dateTo: optionalDate,

  phone: z.string().trim().default(""),
  email: z.string().trim().default(""),

  sortBy: z.enum(SORT_FIELDS).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),

  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine(
      (value) => (PAGE_SIZES as readonly number[]).includes(value),
      `Page size must be one of ${PAGE_SIZES.join(", ")}`,
    )
    .default(10),
});

export type CustomerQuery = z.output<typeof customerQuerySchema>;
export type CustomerQueryInput = z.input<typeof customerQuerySchema>;

export type PaginatedCustomers<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};
