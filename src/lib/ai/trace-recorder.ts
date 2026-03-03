import type { SupabaseClient } from "@supabase/supabase-js";

export interface TraceData {
  tenantId: string;
  customerId: string;
  sessionId: string;
  runId?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  toolsAvailable: string[];
  toolsInvoked: Array<{
    name: string;
    input_summary: string;
    output_summary: string;
  }>;
  memoriesReferenced: Array<{
    id: string;
    content_preview: string;
    score: number;
  }>;
  knowledgeReferenced: Array<{
    id: string;
    source: string;
    chunk_preview: string;
  }>;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalLatencyMs: number;
}

export async function recordConversationTrace(
  admin: SupabaseClient,
  data: TraceData
): Promise<void> {
  await admin.from("tenant_conversation_traces").insert({
    tenant_id: data.tenantId,
    customer_id: data.customerId,
    session_id: data.sessionId,
    run_id: data.runId ?? null,
    agent_id: data.agentId ?? null,
    agent_name: data.agentName ?? null,
    tools_available: data.toolsAvailable,
    tools_invoked: data.toolsInvoked,
    memories_referenced: data.memoriesReferenced,
    knowledge_referenced: data.knowledgeReferenced,
    model_id: data.modelId,
    input_tokens: data.inputTokens,
    output_tokens: data.outputTokens,
    total_latency_ms: data.totalLatencyMs,
  });
}
