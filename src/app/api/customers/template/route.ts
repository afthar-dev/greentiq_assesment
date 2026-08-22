import ExcelJS from "exceljs";

import { getAuthorizedSession } from "@/features/auth/lib/auth-guard";
import {
  IMPORT_COLUMNS,
  IMPORT_SHEET_NAME,
  STATUS_OPTIONS_TEXT,
} from "@/features/customers/lib/import-columns";

/**
 * Generates the reference workbook for bulk import.
 *
 * A route handler rather than a server action because this returns a file:
 * the browser needs a plain GET it can download, and actions are POST-only
 * with a serialized response.
 */
export async function GET() {
  const session = await getAuthorizedSession();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CRM Dashboard";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(IMPORT_SHEET_NAME);

  sheet.columns = IMPORT_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFF3F8" },
  };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // One example row, so the expected shape of every column is visible rather
  // than described.
  sheet.addRow(
    Object.fromEntries(
      IMPORT_COLUMNS.map((column) => [column.key, column.example]),
    ),
  );

  sheet.getRow(2).font = { italic: true, color: { argb: "FF6B7A90" } };

  // Notes sheet: the rules that cannot be expressed as a column.
  const guide = workbook.addWorksheet("How to use");
  guide.columns = [{ width: 22 }, { width: 78 }];

  const lines: [string, string][] = [
    [
      "Sheet to fill in",
      `Enter your customers on the "${IMPORT_SHEET_NAME}" sheet.`,
    ],
    [
      "Example row",
      "Row 2 is an example. Delete it before uploading, or leave it — it will import.",
    ],
    [
      "Required",
      IMPORT_COLUMNS.filter((c) => c.required)
        .map((c) => c.header)
        .join(", "),
    ],
    [
      "Optional",
      IMPORT_COLUMNS.filter((c) => !c.required)
        .map((c) => c.header)
        .join(", "),
    ],
    ["Status values", STATUS_OPTIONS_TEXT],
    [
      "Date format",
      "YYYY-MM-DD, for example 2026-08-01. Leave blank if never contacted.",
    ],
    ["Phone", "10 to 15 digits. Spaces, +, -, ( ) and . are all fine."],
    [
      "Duplicate emails",
      "Rows whose email already exists are skipped and reported, not overwritten.",
    ],
    [
      "Invalid rows",
      "Valid rows still import. Anything rejected is listed with its row number.",
    ],
  ];

  guide.addRow(["Bulk import guide"]).font = { bold: true, size: 14 };
  guide.addRow([]);

  for (const [label, text] of lines) {
    const row = guide.addRow([label, text]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="customer-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
