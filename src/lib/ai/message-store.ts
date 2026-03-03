import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantMessage } from "@/types/tenant-runtime";

interface StoreInboundInput {
  tenantId: string;
  customerId: string;
  sessionId: string;
  discordUserId: string;
  content: string;
  sourceEventId: string | null;
}

interface StoreOutboundInput {
  tenantId: string;
  customerId: string;
  sessionId: string;
  agentId: string | null;
  content: string;
  tokenCount: number | null;
  toolCalls?: Record<string, unknown>[];
}

export async function storeInboundMessage(
  admin: SupabaseClient,
  input: StoreInboundInput
): Promise<TenantMessage> {
  const { data, error } = await admin
    .from("tenant_messages")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      session_id: input.sessionId,
      direction: "inbound",
      author_type: "user",
      author_id: input.discordUserId,
      content_text: input.content,
      content_json: {},
      source_event_id: input.sourceEventId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to store inbound message: ${error.message}`);
  }

  return data as TenantMessage;
}

export async function storeOutboundMessage(
  admin: SupabaseClient,
  input: StoreOutboundInput
): Promise<TenantMessage> {
  const contentJson: Record<string, unknown> = {};
  if (input.toolCalls && input.toolCalls.length > 0) {
    contentJson.tool_calls = input.toolCalls;
  }

  const { data, error } = await admin
    .from("tenant_messages")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      session_id: input.sessionId,
      direction: "outbound",
      author_type: "agent",
      author_id: input.agentId,
      content_text: input.content,
      content_json: contentJson,
      token_count: input.tokenCount,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to store outbound message: ${error.message}`);
  }

  return data as TenantMessage;
}

export async function storeToolMessage(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    customerId: string;
    sessionId: string;
    toolName: string;
    toolCallId: string;
    result: Record<string, unknown>;
  }
): Promise<TenantMessage> {
  const { data, error } = await admin
    .from("tenant_messages")
    .insert({
      tenant_id: input.tenantId,
      customer_id: input.customerId,
      session_id: input.sessionId,
      direction: "tool",
      author_type: "tool",
      author_id: null,
      content_text: null,
      content_json: {
        tool_name: input.toolName,
        tool_call_id: input.toolCallId,
        result: input.result,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to store tool message: ${error.message}`);
  }

  return data as TenantMessage;
}
