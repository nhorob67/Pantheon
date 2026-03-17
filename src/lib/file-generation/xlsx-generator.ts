import type { TabularContent } from "@/types/file-creation";
import ExcelJS from "exceljs";

/**
 * Generate an Excel (.xlsx) buffer from tabular content.
 */
export async function generateXlsx(content: TabularContent): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pantheon";
  workbook.created = new Date();

  const sheetName = content.sheetName || "Sheet1";
  const worksheet = workbook.addWorksheet(sheetName);

  // Add headers with bold styling
  if (content.headers.length > 0) {
    const headerRow = worksheet.addRow(content.headers);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    });
  }

  // Add data rows
  for (const row of content.rows) {
    worksheet.addRow(row.map((v) => (v === null ? "" : v)));
  }

  // Auto-fit column widths (approximate)
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLength) maxLength = Math.min(len, 50);
    });
    column.width = maxLength + 2;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
