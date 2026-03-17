import type { TabularContent } from "@/types/file-creation";

/**
 * Escape a single CSV field per RFC 4180.
 * Fields containing commas, double-quotes, or newlines are quoted.
 */
function escapeField(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate a CSV buffer from tabular content.
 */
export function generateCsv(content: TabularContent): Buffer {
  const lines: string[] = [];

  if (content.headers.length > 0) {
    lines.push(content.headers.map(escapeField).join(","));
  }

  for (const row of content.rows) {
    lines.push(row.map(escapeField).join(","));
  }

  return Buffer.from(lines.join("\r\n") + "\r\n", "utf-8");
}
