import { z } from "zod/v4";
import { FILE_FORMATS, FILE_CREATION_LIMITS } from "@/types/file-creation";

const cellValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const fileCreateInputSchema = z
  .object({
    format: z.enum(FILE_FORMATS),
    filename: z
      .string()
      .min(1, "Filename is required")
      .max(FILE_CREATION_LIMITS.maxFilenameLengthChars),

    // Tabular fields (csv, xlsx)
    headers: z
      .array(z.string())
      .max(FILE_CREATION_LIMITS.maxTabularColumns)
      .optional(),
    rows: z
      .array(z.array(cellValue))
      .max(FILE_CREATION_LIMITS.maxTabularRows)
      .optional(),
    sheet_name: z.string().max(31).optional(),

    // Document fields (pdf, txt, md, html)
    title: z.string().max(500).optional(),
    sections: z
      .array(
        z.object({
          heading: z.string().max(500).optional(),
          body: z.string(),
        })
      )
      .max(FILE_CREATION_LIMITS.maxDocumentSections)
      .optional(),

    // JSON field
    data: z.unknown().optional(),
  })
  .refine(
    (input) => {
      // Tabular formats require headers + rows
      if (input.format === "csv" || input.format === "xlsx") {
        return (
          Array.isArray(input.headers) &&
          input.headers.length > 0 &&
          Array.isArray(input.rows)
        );
      }
      return true;
    },
    { message: "CSV and Excel formats require headers and rows" }
  )
  .refine(
    (input) => {
      // JSON format requires data
      if (input.format === "json") {
        return input.data !== undefined;
      }
      return true;
    },
    { message: "JSON format requires a data field" }
  )
  .refine(
    (input) => {
      // Document formats require sections
      if (
        input.format === "pdf" ||
        input.format === "txt" ||
        input.format === "md" ||
        input.format === "html"
      ) {
        return Array.isArray(input.sections) && input.sections.length > 0;
      }
      return true;
    },
    { message: "Document formats require at least one section" }
  );

export type FileCreateInputData = z.infer<typeof fileCreateInputSchema>;
