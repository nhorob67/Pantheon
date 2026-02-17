import { createClient } from "@/lib/supabase/server";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { docsAskSchema } from "@/lib/validators/docs-ask";
import { getAllDocs, getDocBySlug } from "@/lib/docs/content";
import { stripMdx } from "@/lib/docs/strip-mdx";
import { createDocsAskHandler } from "@/lib/docs/ask-handler";

export const POST = createDocsAskHandler({
  createClient: createClient as unknown as () => Promise<{
    auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  }>,
  consumeDurableRateLimit,
  parseInput: (input) => {
    const parsed = docsAskSchema.safeParse(input);
    if (parsed.success) {
      return { success: true as const, data: parsed.data };
    }

    return { success: false as const, details: parsed.error.flatten() };
  },
  getAllDocs,
  getDocBySlug,
  stripMdx,
  fetchFn: fetch,
  getOpenRouterApiKey: () => process.env.OPENROUTER_API_KEY,
});
