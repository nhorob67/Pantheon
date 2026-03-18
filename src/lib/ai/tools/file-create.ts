import { tool } from "ai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Supported file types and MIME mapping
// ---------------------------------------------------------------------------

const FILE_TYPES = ["csv", "json", "txt", "markdown", "html"] as const;
type FileType = (typeof FILE_TYPES)[number];

const MIME_MAP: Record<FileType, string> = {
  csv: "text/csv",
  json: "application/json",
  txt: "text/plain",
  markdown: "text/markdown",
  html: "text/html",
};

const EXTENSION_MAP: Record<FileType, string> = {
  csv: ".csv",
  json: ".json",
  txt: ".txt",
  markdown: ".md",
  html: ".html",
};

// ---------------------------------------------------------------------------
// Result type returned to the AI worker for Discord delivery
// ---------------------------------------------------------------------------

export interface FileCreateResult {
  fileName: string;
  fileType: FileType;
  contentType: string;
  data: Buffer;
  sizeBytes: number;
}

// In-memory store keyed by run ID — the AI worker reads and clears after generation
const pendingFiles = new Map<string, FileCreateResult[]>();

export function collectPendingFiles(runId: string): FileCreateResult[] {
  const files = pendingFiles.get(runId) ?? [];
  pendingFiles.delete(runId);
  return files;
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createFileCreateTool(runId: string) {
  return {
    file_create: tool({
      description:
        "Create a file (CSV, JSON, TXT, Markdown, or HTML) and deliver it as a Discord attachment. " +
        "Provide the full file content. The file will be sent to the user in the current channel.",
      inputSchema: z.object({
        file_name: z
          .string()
          .min(1)
          .max(200)
          .describe("File name including extension (e.g. report.csv, data.json)"),
        file_type: z
          .enum(FILE_TYPES)
          .describe("The type of file to create"),
        content: z
          .string()
          .min(1)
          .max(500_000)
          .describe("The full text content of the file"),
      }),
      execute: async ({ file_name, file_type, content }): Promise<{
        success: boolean;
        message: string;
        file_name: string;
        file_type: string;
        size_bytes: number;
      }> => {
        const contentType = MIME_MAP[file_type];
        const data = Buffer.from(content, "utf-8");
        const sizeBytes = data.byteLength;

        // Discord file size limit: 8MB for most bots
        const DISCORD_MAX_FILE_SIZE = 8 * 1024 * 1024;
        if (sizeBytes > DISCORD_MAX_FILE_SIZE) {
          return {
            success: false,
            message: `File size (${(sizeBytes / 1024 / 1024).toFixed(1)}MB) exceeds Discord's 8MB attachment limit. Try reducing the content.`,
            file_name,
            file_type,
            size_bytes: sizeBytes,
          };
        }

        // Ensure file name has the right extension
        const ext = EXTENSION_MAP[file_type];
        const fileName = file_name.endsWith(ext) ? file_name : `${file_name}${ext}`;

        const result: FileCreateResult = {
          fileName,
          fileType: file_type,
          contentType,
          data,
          sizeBytes,
        };

        // Queue for the AI worker to pick up after generation completes
        const existing = pendingFiles.get(runId) ?? [];
        existing.push(result);
        pendingFiles.set(runId, existing);

        return {
          success: true,
          file_name: fileName,
          file_type,
          size_bytes: sizeBytes,
          message: `Created ${fileName} (${(sizeBytes / 1024).toFixed(1)}KB). It will be sent as a Discord attachment.`,
        };
      },
    }),
  };
}
