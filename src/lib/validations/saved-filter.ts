import { z } from "zod";

import { CustomerStatus } from "@/generated/prisma/client";

/**
 * Shape of a saved filter's `criteria` column.
 *
 * Deliberately only the filter fields — no sort, no page. Sorting is the
 * user's current view preference, and silently changing it when they apply a
 * saved filter would be surprising. Page is meaningless to save.
 *
 * The column is `Json`, so Postgres will store anything: this schema is the
 * only thing keeping it honest, and it runs on both write and read.
 */
export const filterCriteriaSchema = z.object({
  status: z.array(z.enum(CustomerStatus)).default([]),
  company: z.array(z.string()).default([]),
  dateFrom: z.union([z.iso.date(), z.literal("")]).default(""),
  dateTo: z.union([z.iso.date(), z.literal("")]).default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
});

export type FilterCriteria = z.infer<typeof filterCriteriaSchema>;

export const EMPTY_CRITERIA: FilterCriteria = {
  status: [],
  company: [],
  dateFrom: "",
  dateTo: "",
  phone: "",
  email: "",
};

export const savedFilterInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give this filter a name")
    .max(60, "Name is limited to 60 characters"),
  criteria: filterCriteriaSchema,
});

export const savedFilterIdSchema = z.cuid("Invalid filter id");

export type SavedFilterInput = z.input<typeof savedFilterInputSchema>;
