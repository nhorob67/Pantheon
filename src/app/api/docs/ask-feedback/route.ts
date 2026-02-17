import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { docsAskFeedbackSchema } from "@/lib/validators/docs-ask-feedback";
import { createDocsAskFeedbackHandler } from "@/lib/docs/ask-feedback-handler";

export const POST = createDocsAskFeedbackHandler({
  createClient: createClient as unknown as () => Promise<{
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
    from: (table: "customers") => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string
        ) => {
          single: () => Promise<{ data: { id: string } | null }>;
        };
      };
    };
  }>,
  createAdminClient: createAdminClient as unknown as () => {
    from: (table: "telemetry_events") => {
      insert: (value: Record<string, unknown>) => Promise<{
        error: { code?: string; message: string } | null;
      }>;
    };
  },
  consumeDurableRateLimit,
  parseInput: (input) => {
    const parsed = docsAskFeedbackSchema.safeParse(input);
    if (parsed.success) {
      return { success: true as const, data: parsed.data };
    }

    return { success: false as const, details: parsed.error.flatten() };
  },
});
