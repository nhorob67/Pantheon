import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  HeartbeatOperatorEvent,
  HeartbeatOperatorEventType,
} from "@/types/heartbeat";

interface RecordHeartbeatOperatorEventInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  configId?: string | null;
  agentId?: string | null;
  actorUserId?: string | null;
  eventType: HeartbeatOperatorEventType;
  summary: string;
  metadata?: Record<string, unknown>;
}

export async function recordHeartbeatOperatorEvent(
  input: RecordHeartbeatOperatorEventInput
): Promise<void> {
  const { error } = await input.admin
    .from("tenant_heartbeat_events")
    .insert({
      tenant_id: input.tenantId,
      config_id: input.configId ?? null,
      customer_id: input.customerId,
      agent_id: input.agentId ?? null,
      actor_user_id: input.actorUserId ?? null,
      event_type: input.eventType,
      summary: input.summary,
      metadata: input.metadata ?? {},
    });

  if (error) {
    console.error("Failed to record heartbeat operator event", error.message);
  }
}

export function asHeartbeatOperatorEvents(value: unknown): HeartbeatOperatorEvent[] {
  return Array.isArray(value) ? (value as HeartbeatOperatorEvent[]) : [];
}
