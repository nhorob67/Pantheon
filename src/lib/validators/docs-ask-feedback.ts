import { z } from "zod";
import { DOCS_ASK_FEEDBACK_SURFACES } from "@/lib/docs/ask-feedback-surface";

const sourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().regex(/^[a-z0-9-/]+$/),
});

export const docsAskFeedbackSchema = z.object({
  query: z.string().trim().min(3).max(500),
  helpful: z.boolean(),
  sources: z.array(sourceSchema).max(10).optional().default([]),
  surface: z.enum(DOCS_ASK_FEEDBACK_SURFACES).optional().default("docs_modal"),
});

export type DocsAskFeedbackInput = z.infer<typeof docsAskFeedbackSchema>;
