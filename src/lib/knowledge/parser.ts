import type { KnowledgeFileType } from "@/types/knowledge";
import { MAX_PARSED_SIZE } from "@/types/knowledge";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Parse an uploaded file buffer to Markdown.
 * Throws on unsupported formats or parsing failures.
 */
export async function parseFile(
  buffer: Buffer,
  fileType: KnowledgeFileType,
  fileName: string
): Promise<string> {
  let raw: string;

  switch (fileType) {
    case "pdf":
      raw = await parsePdf(buffer);
      break;
    case "docx":
      raw = await parseDocx(buffer);
      break;
    case "md":
      raw = buffer.toString("utf-8");
      break;
    case "txt":
      raw = `# ${stripExtension(fileName)}\n\n${buffer.toString("utf-8")}`;
      break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  return sanitizeMarkdown(raw);
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const directText = await parsePdfWithPdfParse(buffer);
  if (directText) {
    return directText;
  }

  const pdftotextText = await parsePdfWithPdftotext(buffer);
  if (pdftotextText) {
    return pdftotextText;
  }

  const ocrText = await parsePdfWithOcr(buffer);
  if (ocrText) {
    return ocrText;
  }

  throw new Error(
    "PDF appears to be empty or image-only. OCR fallback was attempted but no text was extracted."
  );
}

async function parsePdfWithPdfParse(buffer: Buffer): Promise<string | null> {
  const { PDFParse } = await import("pdf-parse");
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await pdf.getText();
    return normalizeText(result.text);
  } catch {
    return null;
  } finally {
    await pdf.destroy().catch(() => undefined);
  }
}

async function parsePdfWithPdftotext(buffer: Buffer): Promise<string | null> {
  const tempDir = await mkdtemp(join(tmpdir(), "farmclaw-pdf-"));
  const inputPath = join(tempDir, "input.pdf");
  const outputPath = join(tempDir, "output.txt");

  try {
    await writeFile(inputPath, buffer);
    await execFileAsync("pdftotext", ["-layout", inputPath, outputPath], {
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024,
    });

    const extracted = await readFile(outputPath, "utf-8");
    return normalizeText(extracted);
  } catch {
    return null;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function parsePdfWithOcr(buffer: Buffer): Promise<string | null> {
  const tempDir = await mkdtemp(join(tmpdir(), "farmclaw-pdf-ocr-"));
  const inputPath = join(tempDir, "input.pdf");
  const ocrScript = [
    "import sys",
    "from pdf2image import convert_from_path",
    "import pytesseract",
    "pdf_path = sys.argv[1]",
    "images = convert_from_path(pdf_path)",
    "parts = []",
    "for image in images:",
    "    text = pytesseract.image_to_string(image)",
    "    if text and text.strip():",
    "        parts.append(text.strip())",
    "print('\\n\\n'.join(parts))",
  ].join("\n");

  try {
    await writeFile(inputPath, buffer);
    const { stdout } = await execFileAsync("python3", ["-c", ocrScript, inputPath], {
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });

    return normalizeText(stdout);
  } catch {
    return null;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function normalizeText(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.trim();
  return cleaned.length > 0 ? cleaned : null;
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });

  if (!result.value || result.value.trim().length === 0) {
    throw new Error("DOCX appears to be empty");
  }

  return result.value;
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

/**
 * Strip potentially harmful content and enforce size limit.
 */
function sanitizeMarkdown(content: string): string {
  let cleaned = content
    // Remove HTML script/iframe tags
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Remove HTML event handlers
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Collapse excessive blank lines (3+ → 2)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Enforce max size
  if (Buffer.byteLength(cleaned, "utf-8") > MAX_PARSED_SIZE) {
    // Truncate to size limit at a paragraph boundary
    const encoder = new TextEncoder();
    let byteCount = 0;
    const lines = cleaned.split("\n");
    const kept: string[] = [];

    for (const line of lines) {
      byteCount += encoder.encode(line + "\n").length;
      if (byteCount > MAX_PARSED_SIZE) break;
      kept.push(line);
    }

    cleaned = kept.join("\n").trim();
  }

  return cleaned;
}
