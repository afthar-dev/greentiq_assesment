import { CustomerStatus } from "@/generated/prisma/client";
import { STATUS_LABELS } from "@/features/customers/schemas/customer";

/**
 * Column contract for bulk import.
 *
 * The same definition generates the downloadable reference sheet and drives
 * the parser, so the file we hand out cannot drift from the file we accept.
 */
export const IMPORT_COLUMNS = [
  {
    key: "name",
    header: "Name",
    width: 24,
    required: true,
    example: "Eleanor Henderson",
  },
  {
    key: "email",
    header: "Email",
    width: 30,
    required: true,
    example: "eleanor@acme.com",
  },
  {
    key: "phone",
    header: "Phone",
    width: 20,
    required: true,
    example: "+91 98765 43210",
  },
  {
    key: "company",
    header: "Company",
    width: 22,
    required: true,
    example: "Acme Corp",
  },
  {
    key: "status",
    header: "Status",
    width: 20,
    required: true,
    example: "Active customer",
  },
  {
    key: "lastContactAt",
    header: "Last Contact (YYYY-MM-DD)",
    width: 26,
    required: false,
    example: "2026-08-01",
  },
  {
    key: "notes",
    header: "Notes",
    width: 40,
    required: false,
    example: "Met at the Q3 summit.",
  },
] as const;

export const IMPORT_SHEET_NAME = "Customers";
export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Status accepts either the stored enum value or the label shown in the UI,
 * case-insensitively — a user filling in a spreadsheet will type what they see
 * on screen, not ACTIVE_CUSTOMER.
 */
const STATUS_LOOKUP = new Map<string, CustomerStatus>();

for (const status of Object.values(CustomerStatus)) {
  STATUS_LOOKUP.set(status.toLowerCase(), status);
  STATUS_LOOKUP.set(STATUS_LABELS[status].toLowerCase(), status);
  STATUS_LOOKUP.set(
    STATUS_LABELS[status].toLowerCase().replace(/\s+/g, ""),
    status,
  );
}

export function normaliseStatus(value: string): CustomerStatus | null {
  return STATUS_LOOKUP.get(value.trim().toLowerCase()) ?? null;
}

export const STATUS_OPTIONS_TEXT = Object.values(CustomerStatus)
  .map((status) => STATUS_LABELS[status])
  .join(", ");

export type ImportRowError = {
  /** 1-based row number as shown in Excel, so the user can find it. */
  row: number;
  field: string;
  message: string;
};

export type ImportSummary = {
  totalRows: number;
  created: number;
  skippedDuplicates: number;
  failed: number;
  errors: ImportRowError[];
  /** Emails already in the database, reported rather than overwritten. */
  duplicates: string[];
};
