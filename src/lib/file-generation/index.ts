import type {
  FileFormat,
  FileContent,
  FileGenerationResult,
  TabularContent,
  DocumentContent,
  JsonContent,
  FileCreateToolInput,
} from "../../types/file-creation.ts";
import { FORMAT_CONTENT_TYPES, FORMAT_EXTENSIONS } from "../../types/file-creation.ts";
import { generateCsv } from "./csv-generator.ts";
import { generateXlsx } from "./xlsx-generator.ts";
import { generatePdf } from "./pdf-generator.ts";
import { generateJson } from "./json-generator.ts";
import { generateText } from "./text-generator.ts";
import { generateHtml } from "./html-generator.ts";
import { sanitizeFilename } from "./sanitize.ts";

// ---------------------------------------------------------------------------
// Content resolution — convert flat tool input into typed content
// ---------------------------------------------------------------------------

export function resolveContent(input: FileCreateToolInput): FileContent {
  const { format } = input;

  if (format === "csv" || format === "xlsx") {
    return {
      type: "tabular",
      headers: input.headers ?? [],
      rows: input.rows ?? [],
      sheetName: input.sheet_name,
    } satisfies TabularContent;
  }

  if (format === "json") {
    return {
      type: "json",
      data: input.data ?? {},
    } satisfies JsonContent;
  }

  // pdf, txt, md, html → document
  return {
    type: "document",
    title: input.title,
    sections: input.sections ?? [],
  } satisfies DocumentContent;
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export async function generateFile(
  format: FileFormat,
  content: FileContent,
  rawFilename: string
): Promise<FileGenerationResult> {
  const filename = sanitizeFilename(rawFilename, FORMAT_EXTENSIONS[format]);
  let buffer: Buffer;

  switch (format) {
    case "csv":
      buffer = generateCsv(content as TabularContent);
      break;
    case "xlsx":
      buffer = await generateXlsx(content as TabularContent);
      break;
    case "pdf":
      buffer = await generatePdf(content as DocumentContent);
      break;
    case "json":
      buffer = generateJson(content as JsonContent);
      break;
    case "txt":
    case "md":
      buffer = generateText(content as DocumentContent);
      break;
    case "html":
      buffer = generateHtml(content as DocumentContent);
      break;
    default: {
      const _: never = format;
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  return {
    buffer,
    contentType: FORMAT_CONTENT_TYPES[format],
    filename,
    sizeBytes: buffer.length,
  };
}
