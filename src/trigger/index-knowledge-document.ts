import { task } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { indexKnowledgeDocument } from "@/lib/ai/knowledge-indexer";

export const indexKnowledgeDocumentTask = task({
  id: "index-knowledge-document",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 15000,
    factor: 2,
  },
  run: async (payload: {
    knowledgeItemId: string;
    tenantId: string;
    customerId: string;
    agentId: string | null;
    content: string;
  }) => {
    const admin = createTriggerAdminClient();

    // Verify the item still exists and isn't archived (race protection)
    const { data: item } = await admin
      .from("tenant_knowledge_items")
      .select("id, status")
      .eq("id", payload.knowledgeItemId)
      .maybeSingle();

    if (!item || item.status === "archived") {
      return {
        skipped: true,
        reason: item ? "archived" : "not_found",
        knowledgeItemId: payload.knowledgeItemId,
      };
    }

    const result = await indexKnowledgeDocument(admin, {
      tenantId: payload.tenantId,
      customerId: payload.customerId,
      knowledgeItemId: payload.knowledgeItemId,
      agentId: payload.agentId,
      content: payload.content,
    });

    // Mark the item as indexed
    await admin
      .from("tenant_knowledge_items")
      .update({ indexed_at: new Date().toISOString() })
      .eq("id", payload.knowledgeItemId);

    return {
      knowledgeItemId: payload.knowledgeItemId,
      tenantId: payload.tenantId,
      chunksCreated: result.chunksCreated,
    };
  },
});
