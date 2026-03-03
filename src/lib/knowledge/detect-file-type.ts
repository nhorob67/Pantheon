import type { KnowledgeFileType } from "@/types/knowledge";

/** PDF magic bytes: %PDF */
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

/** DOCX (ZIP) magic bytes: PK\x03\x04 */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * Detect file type from magic bytes in the buffer header.
 * Returns null if the format is not recognized.
 */
export function detectFileTypeFromBuffer(
  buffer: Buffer
): "pdf" | "docx" | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    return "pdf";
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
    return "docx";
  }
  return null;
}

/**
 * Validate that the buffer's magic bytes are consistent with the claimed
 * file type. For binary formats (pdf, docx) we check magic bytes. For text
 * formats (md, txt) we check that the first 8 KB contains no null bytes.
 */
export function validateFileTypeMatchesMagicBytes(
  buffer: Buffer,
  claimedType: KnowledgeFileType
): boolean {
  if (claimedType === "pdf") {
    return buffer.length >= 4 && buffer.subarray(0, 4).equals(PDF_MAGIC);
  }

  if (claimedType === "docx") {
    return buffer.length >= 4 && buffer.subarray(0, 4).equals(ZIP_MAGIC);
  }

  // Text formats: ensure no null bytes in the first 8 KB
  const checkLength = Math.min(buffer.length, 8192);
  for (let i = 0; i < checkLength; i++) {
    if (buffer[i] === 0x00) {
      return false;
    }
  }
  return true;
}
