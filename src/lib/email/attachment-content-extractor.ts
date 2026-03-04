import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFile } from "@/lib/knowledge/parser";
import type { KnowledgeFileType } from "@/types/knowledge";

export interface ExtractedAttachmentContent {
  filename: string;
  mimeType: string;
  type: "document" | "image" | "unsupported";
  parsedText: string | null;
  imageUrl: string | null;
  sizeBytes: number;
}

interface AttachmentRow {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number;
  storage_bucket: string;
  storage_path: string;
}

const MIME_TO_FILE_TYPE: Record<string, KnowledgeFileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "text/markdown": "md",
};

const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const SIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * Download and extract content from email attachments stored in Supabase Storage.
 * Returns parsed text for documents and signed URLs for images.
 */
export async function extractAttachmentContents(
  admin: SupabaseClient,
  inboundId: string
): Promise<ExtractedAttachmentContent[]> {
  const { data: rows, error } = await admin
    .from("email_inbound_attachments")
    .select("id, filename, mime_type, size_bytes, storage_bucket, storage_path")
    .eq("inbound_id", inboundId)
    .order("created_at", { ascending: true });

  if (error || !rows) {
    return [];
  }

  const results: ExtractedAttachmentContent[] = [];

  for (const row of rows as AttachmentRow[]) {
    const mime = (row.mime_type || "").toLowerCase();

    if (IMAGE_MIME_TYPES.has(mime)) {
      const imageUrl = await getSignedUrl(admin, row.storage_bucket, row.storage_path);
      results.push({
        filename: row.filename,
        mimeType: mime,
        type: "image",
        parsedText: null,
        imageUrl,
        sizeBytes: row.size_bytes,
      });
      continue;
    }

    const fileType = MIME_TO_FILE_TYPE[mime];
    if (fileType) {
      try {
        const buffer = await downloadAttachment(admin, row.storage_bucket, row.storage_path);
        const parsed = await parseFile(buffer, fileType, row.filename);
        results.push({
          filename: row.filename,
          mimeType: mime,
          type: "document",
          parsedText: parsed,
          imageUrl: null,
          sizeBytes: row.size_bytes,
        });
      } catch {
        results.push({
          filename: row.filename,
          mimeType: mime,
          type: "document",
          parsedText: `[Failed to parse ${row.filename}]`,
          imageUrl: null,
          sizeBytes: row.size_bytes,
        });
      }
      continue;
    }

    results.push({
      filename: row.filename,
      mimeType: mime,
      type: "unsupported",
      parsedText: null,
      imageUrl: null,
      sizeBytes: row.size_bytes,
    });
  }

  return results;
}

async function downloadAttachment(
  admin: SupabaseClient,
  bucket: string,
  path: string
): Promise<Buffer> {
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Failed to download attachment: ${error?.message || "no data"}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function getSignedUrl(
  admin: SupabaseClient,
  bucket: string,
  path: string
): Promise<string | null> {
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data) {
    return null;
  }
  return data.signedUrl;
}
