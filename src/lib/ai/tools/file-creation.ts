import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateFile, resolveContent } from "@/lib/file-generation/index";
import { storeAgentFile } from "@/lib/file-generation/file-storage";
import { FILE_FORMATS, FILE_CREATION_LIMITS } from "@/types/file-creation";
import type { FileFormat, FileCreateToolInput } from "@/types/file-creation";

const cellValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export interface FileCreationToolConfig {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string;
  channelId?: string;
  /**
   * Callback invoked after a file is generated and stored.
   * The AI worker uses this to queue the file for Discord attachment delivery.
   */
  onFileCreated?: (file: {
    filename: string;
    buffer: Buffer;
    contentType: string;
    sizeBytes: number;
    storageKey: string;
    signedUrl: string;
  }) => void;
}

export function createFileCreationTool(config: FileCreationToolConfig) {
  return {
    file_create: tool({
      description:
        "Generate a file (CSV, Excel, PDF, JSON, TXT, Markdown, or HTML) and deliver it as a Discord attachment. " +
        "For tabular formats (csv, xlsx), provide headers and rows. " +
        "For document formats (pdf, txt, md, html), provide sections with optional headings. " +
        "For JSON, provide a data object.",
      inputSchema: z.object({
        format: z
          .enum(FILE_FORMATS)
          .describe("File format to generate"),
        filename: z
          .string()
          .min(1)
          .max(FILE_CREATION_LIMITS.maxFilenameLengthChars)
          .describe("Output filename (extension added automatically if missing)"),
        title: z
          .string()
          .max(500)
          .optional()
          .describe("Document title (for pdf, txt, md, html)"),
        headers: z
          .array(z.string())
          .max(FILE_CREATION_LIMITS.maxTabularColumns)
          .optional()
          .describe("Column headers (required for csv and xlsx)"),
        rows: z
          .array(z.array(cellValue))
          .max(FILE_CREATION_LIMITS.maxTabularRows)
          .optional()
          .describe("Data rows (required for csv and xlsx)"),
        sheet_name: z
          .string()
          .max(31)
          .optional()
          .describe("Worksheet name (xlsx only, max 31 chars)"),
        sections: z
          .array(
            z.object({
              heading: z.string().max(500).optional(),
              body: z.string(),
            })
          )
          .max(FILE_CREATION_LIMITS.maxDocumentSections)
          .optional()
          .describe("Document sections (required for pdf, txt, md, html)"),
        data: z
          .unknown()
          .optional()
          .describe("Arbitrary JSON data (required for json format)"),
      }),
      execute: async (input) => {
        const format = input.format as FileFormat;

        // Validate format-specific requirements
        if ((format === "csv" || format === "xlsx") && (!input.headers || !input.rows)) {
          return {
            success: false,
            error: `${format.toUpperCase()} format requires both "headers" and "rows" fields.`,
          };
        }

        if (format === "json" && input.data === undefined) {
          return {
            success: false,
            error: 'JSON format requires a "data" field.',
          };
        }

        if (
          (format === "pdf" || format === "txt" || format === "md" || format === "html") &&
          (!input.sections || input.sections.length === 0)
        ) {
          return {
            success: false,
            error: `${format.toUpperCase()} format requires at least one entry in "sections".`,
          };
        }

        try {
          const toolInput: FileCreateToolInput = {
            format,
            filename: input.filename,
            title: input.title,
            headers: input.headers,
            rows: input.rows as (string | number | boolean | null)[][] | undefined,
            sheet_name: input.sheet_name,
            sections: input.sections,
            data: input.data,
          };

          const content = resolveContent(toolInput);
          const result = await generateFile(format, content, input.filename);

          // Enforce size limit
          if (result.sizeBytes > FILE_CREATION_LIMITS.maxFileSizeBytes) {
            return {
              success: false,
              error: `Generated file is ${(result.sizeBytes / 1024 / 1024).toFixed(1)} MB, which exceeds the 10 MB limit. Try reducing the data.`,
            };
          }

          // Store in Supabase Storage
          const stored = await storeAgentFile(config.admin, {
            tenantId: config.tenantId,
            customerId: config.customerId,
            agentId: config.agentId,
            filename: result.filename,
            fileFormat: format,
            data: result.buffer,
            contentType: result.contentType,
            channelId: config.channelId,
          });

          // Notify the AI worker to attach this file to the Discord response
          if (config.onFileCreated) {
            config.onFileCreated({
              filename: result.filename,
              buffer: result.buffer,
              contentType: result.contentType,
              sizeBytes: result.sizeBytes,
              storageKey: stored.storageKey,
              signedUrl: stored.signedUrl,
            });
          }

          return {
            success: true,
            filename: result.filename,
            format,
            size_bytes: result.sizeBytes,
            storage_key: stored.storageKey,
            delivered_via: result.sizeBytes <= FILE_CREATION_LIMITS.discordAttachmentMaxBytes
              ? "discord_attachment"
              : "signed_url",
            message:
              result.sizeBytes <= FILE_CREATION_LIMITS.discordAttachmentMaxBytes
                ? `File "${result.filename}" (${(result.sizeBytes / 1024).toFixed(1)} KB) will be attached to your Discord message.`
                : `File "${result.filename}" (${(result.sizeBytes / 1024 / 1024).toFixed(1)} MB) is too large for Discord attachment. Download link: ${stored.signedUrl}`,
          };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : "File generation failed",
          };
        }
      },
    }),
  };
}
