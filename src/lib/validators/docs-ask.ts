import { z } from "zod";

export const docsAskSchema = z.object({
  query: z.string().trim().min(3).max(500),
  slugs: z
    .array(z.string().trim().regex(/^[a-z0-9-/]+$/))
    .max(5)
    .optional()
    .default([]),
});

export type DocsAskInput = z.infer<typeof docsAskSchema>;
