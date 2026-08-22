"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";

import { getAuthorizedSession } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  IMPORT_COLUMNS,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  normaliseStatus,
  type ImportRowError,
  type ImportSummary,
} from "@/lib/customer-import";
import { customerInputSchema } from "@/lib/validations/customer";
import type { ActionResult } from "@/app/actions/customerActions";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Excel gives dates back as Date objects, everything else as text or numbers. */
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    // Read in UTC: ExcelJS returns the serial date as a UTC midnight, and
    // reading local parts here would shift the day either side of midnight.
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    // Rich text, formula results and hyperlinks all arrive as objects.
    if ("text" in value && typeof value.text === "string")
      return value.text.trim();
    if ("result" in value) return String(value.result ?? "").trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part) => part.text)
        .join("")
        .trim();
    }
    return "";
  }

  return String(value).trim();
}

/**
 * Bulk import from an .xlsx workbook.
 *
 * Parsing happens on the server: a client-side parser would mean trusting rows
 * the browser assembled, and the same zod schema that guards the form has to
 * guard this path too.
 *
 * Valid rows import even when others fail — a 200-row sheet with one bad phone
 * number should not be rejected wholesale. Rows whose email already exists are
 * skipped and reported rather than overwritten.
 */
export async function importCustomers(
  formData: FormData,
): Promise<ActionResult<ImportSummary>> {
  const session = await getAuthorizedSession();

  if (!session) {
    return { ok: false, error: "You are not signed in." };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false, error: "No file was uploaded." };
  }

  if (file.size === 0) {
    return { ok: false, error: "That file is empty." };
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      error: `File is too large. The limit is ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`,
    };
  }

  // Extension is checked as well as MIME: browsers report inconsistent types
  // for .xlsx, and neither alone is reliable.
  const isXlsx =
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.type === XLSX_MIME ||
    file.type === "application/octet-stream";

  if (!isXlsx) {
    return { ok: false, error: "Please upload an .xlsx file." };
  }

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return {
      ok: false,
      error: "That file could not be read. Is it a valid .xlsx workbook?",
    };
  }

  // First worksheet, so a renamed sheet still works.
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return { ok: false, error: "The workbook has no sheets." };
  }

  // Map headers to columns by name, so column order in the sheet does not
  // matter and an extra column is simply ignored.
  const headerRow = sheet.getRow(1);
  const headerToIndex = new Map<string, number>();

  headerRow.eachCell((cell, index) => {
    headerToIndex.set(cellToString(cell.value).toLowerCase(), index);
  });

  const columnIndex = new Map<string, number>();
  const missingHeaders: string[] = [];

  for (const column of IMPORT_COLUMNS) {
    const index = headerToIndex.get(column.header.toLowerCase());

    if (index === undefined) {
      if (column.required) missingHeaders.push(column.header);
      continue;
    }

    columnIndex.set(column.key, index);
  }

  if (missingHeaders.length > 0) {
    return {
      ok: false,
      error: `The sheet is missing these columns: ${missingHeaders.join(", ")}. Download the reference sheet and use its headers.`,
    };
  }

  type Candidate = {
    row: number;
    data: Awaited<ReturnType<typeof customerInputSchema.parse>>;
  };

  const candidates: Candidate[] = [];
  const errors: ImportRowError[] = [];
  let totalRows = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const read = (key: string) => {
      const index = columnIndex.get(key);
      return index ? cellToString(row.getCell(index).value) : "";
    };

    const raw = {
      name: read("name"),
      email: read("email"),
      phone: read("phone"),
      company: read("company"),
      status: read("status"),
      lastContactAt: read("lastContactAt"),
      notes: read("notes"),
    };

    // Blank rows are normal in spreadsheets; they are not errors.
    if (Object.values(raw).every((value) => value === "")) continue;

    totalRows++;

    if (totalRows > MAX_IMPORT_ROWS) {
      return {
        ok: false,
        error: `That sheet has more than ${MAX_IMPORT_ROWS} rows. Split it into smaller files.`,
      };
    }

    const status = normaliseStatus(raw.status);

    if (!status) {
      errors.push({
        row: rowNumber,
        field: "Status",
        message: raw.status
          ? `"${raw.status}" is not a valid status`
          : "Status is required",
      });
      continue;
    }

    const parsed = customerInputSchema.safeParse({ ...raw, status });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        const column = IMPORT_COLUMNS.find((item) => item.key === key);

        errors.push({
          row: rowNumber,
          field: column?.header ?? key,
          message: issue.message,
        });
      }
      continue;
    }

    candidates.push({ row: rowNumber, data: parsed.data });
  }

  // Duplicates within the sheet itself: keep the first, report the rest.
  const seen = new Map<string, number>();
  const unique: Candidate[] = [];

  for (const candidate of candidates) {
    const existingRow = seen.get(candidate.data.email);

    if (existingRow) {
      errors.push({
        row: candidate.row,
        field: "Email",
        message: `Duplicate of row ${existingRow} in this sheet`,
      });
      continue;
    }

    seen.set(candidate.data.email, candidate.row);
    unique.push(candidate);
  }

  // One query for every email, rather than one per row.
  const existing = await prisma.customer.findMany({
    where: { email: { in: unique.map((item) => item.data.email) } },
    select: { email: true },
  });

  const existingEmails = new Set(existing.map((item) => item.email));
  const toCreate = unique.filter(
    (item) => !existingEmails.has(item.data.email),
  );

  let created = 0;

  if (toCreate.length > 0) {
    const result = await prisma.customer.createMany({
      data: toCreate.map((item) => item.data),
      // Guards against a row inserted between the check above and this write.
      skipDuplicates: true,
    });

    created = result.count;
  }

  if (created > 0) {
    revalidatePath("/customers");
    revalidatePath("/");
  }

  return {
    ok: true,
    data: {
      totalRows,
      created,
      skippedDuplicates: unique.length - toCreate.length,
      failed: new Set(errors.map((item) => item.row)).size,
      errors,
      duplicates: [...existingEmails],
    },
  };
}
