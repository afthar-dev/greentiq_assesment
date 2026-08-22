import { z } from "zod";

import { CustomerStatus } from "@/generated/prisma/client";

export const CUSTOMER_STATUSES = Object.values(CustomerStatus);

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  ACTIVE_CUSTOMER: "Active customer",
  PROSPECT: "Prospect",
  LEAD: "Lead",
  INACTIVE_CUSTOMER: "Inactive customer",
  ARCHIVED: "Archived",
};

const PHONE_CHARACTERS = /^\+?[\d\s().-]+$/;
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

const phone = z
  .string()
  .trim()
  .min(1, "Phone is required")
  .refine(
    (value) => PHONE_CHARACTERS.test(value),
    "Phone can only contain digits, spaces and + ( ) - .",
  )
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS;
  }, `Phone must have between ${MIN_PHONE_DIGITS} and ${MAX_PHONE_DIGITS} digits`);

/**
 * Accepts what a date input posts ("yyyy-MM-dd" or "" for cleared) and also a
 * Date, because react-hook-form hands the schema's *output* to the submit
 * handler — so the value reaching the server action has already been
 * transformed once. Accepting both keeps the action safe to call from
 * anywhere without re-encoding the value first.
 */
const optionalDate = z
  .union([z.iso.date(), z.literal(""), z.date()])
  .transform((value) => {
    if (value === "") return null;
    return value instanceof Date ? value : new Date(value);
  })
  .nullable();

export const customerInputSchema = z.object({
  name: z.string().trim().min(4, "Name must be at least 4 characters").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address")),
  phone,
  company: z.string().trim().min(1, "Company is required").max(120),
  status: z.enum(CustomerStatus),
  lastContactAt: optionalDate.optional(),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes are limited to 2000 characters")
    .optional(),
});

export const customerUpdateSchema = customerInputSchema.partial().extend({
  id: z.cuid("Invalid customer id"),
});

export const customerIdSchema = z.cuid("Invalid customer id");

export type CustomerInput = z.input<typeof customerInputSchema>;
/** Post-transform shape: what the submit handler and the action receive. */
export type CustomerValues = z.output<typeof customerInputSchema>;
export type CustomerUpdateInput = z.input<typeof customerUpdateSchema>;
