import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActivityFeedEvent {
  id: string;
  agentName: string;
  agentColor: string;
  actionType: "message" | "skill" | "schedule" | "email" | "memory";
  summary: string;
  channel?: string;
  timestamp: string;
  conversationId?: string;
}

const AGENT_COLORS = [
  "#C4883F",
  "#5E8C61",
  "#7C6FAF",
  "#C75C5C",
  "#5C9EC7",
  "#C7A55C",
  "#8C5E7A",
  "#5EC7A5",
];

interface TraceRow {
  id: string;
  session_id: string;
  agent_id: string | null;
  agent_name: string | null;
  tools_invoked: Array<{ name: string; input_summary?: string }> | null;
  memories_referenced: Array<{ id: string }> | null;
  created_at: string;
}

interface RunRow {
  id: string;
  run_kind: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

function classifyTrace(
  trace: TraceRow
): Pick<ActivityFeedEvent, "actionType" | "summary"> {
  const tools = trace.tools_invoked ?? [];
  const memories = trace.memories_referenced ?? [];

  if (tools.length > 0) {
    const toolName = tools[0].name;
    return {
      actionType: "skill",
      summary: `Used ${toolName}${tools.length > 1 ? ` and ${tools.length - 1} more` : ""}`,
    };
  }

  if (memories.length > 0) {
    return {
      actionType: "memory",
      summary: `Referenced ${memories.length} ${memories.length === 1 ? "memory" : "memories"}`,
    };
  }

  return { actionType: "message", summary: "Responded in conversation" };
}

function classifyRun(
  run: RunRow
): Pick<ActivityFeedEvent, "actionType" | "summary"> {
  if (run.run_kind === "email_runtime") {
    return { actionType: "email", summary: "Processed inbound email" };
  }

  if (run.metadata?.cron_schedule_id) {
    return { actionType: "schedule", summary: "Ran scheduled task" };
  }

  return { actionType: "message", summary: "Processed request" };
}

export interface ActivityFeedResult {
  events: ActivityFeedEvent[];
  agentNames: string[];
}

export async function fetchActivityFeed(
  admin: SupabaseClient,
  tenantId: string,
  limit = 30
): Promise<ActivityFeedResult> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [tracesResult, runsResult, agentsResult] = await Promise.all([
    admin
      .from("tenant_conversation_traces")
      .select(
        "id, session_id, agent_id, agent_name, tools_invoked, memories_referenced, created_at"
      )
      .eq("tenant_id", tenantId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(limit),

    admin
      .from("tenant_runtime_runs")
      .select("id, run_kind, status, metadata, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", cutoff)
      .in("status", ["completed", "failed"])
      .order("created_at", { ascending: false })
      .limit(limit),

    admin
      .from("tenant_agents")
      .select("id, display_name, discord_channel_name")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true }),
  ]);

  const traces = (tracesResult.data ?? []) as TraceRow[];
  const runs = (runsResult.data ?? []) as RunRow[];
  const agents = (agentsResult.data ?? []) as Array<{
    id: string;
    display_name: string;
    discord_channel_name: string | null;
  }>;

  // Build agent color/name maps
  const agentColorMap = new Map<string, string>();
  const agentNameMap = new Map<string, string>();
  const agentChannelMap = new Map<string, string>();
  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    agentColorMap.set(agent.id, AGENT_COLORS[i % AGENT_COLORS.length]);
    agentNameMap.set(agent.id, agent.display_name);
    if (agent.discord_channel_name) {
      agentChannelMap.set(agent.id, agent.discord_channel_name);
    }
  }

  // Convert traces to events
  const traceEvents: ActivityFeedEvent[] = traces.map((trace) => {
    const { actionType, summary } = classifyTrace(trace);
    const agentId = trace.agent_id ?? "";
    return {
      id: trace.id,
      agentName: trace.agent_name ?? agentNameMap.get(agentId) ?? "Agent",
      agentColor: agentColorMap.get(agentId) ?? AGENT_COLORS[0],
      actionType,
      summary,
      channel: agentChannelMap.get(agentId),
      timestamp: trace.created_at,
      conversationId: trace.session_id,
    };
  });

  // Convert runs to events (only schedule/email runs not already covered by traces)
  const runEvents: ActivityFeedEvent[] = runs
    .filter((run) => {
      // Only include schedule and email runs
      if (
        run.run_kind !== "email_runtime" &&
        !run.metadata?.cron_schedule_id
      ) {
        return false;
      }
      return true;
    })
    .map((run) => {
      const { actionType, summary } = classifyRun(run);
      return {
        id: run.id,
        agentName: "System",
        agentColor: AGENT_COLORS[0],
        actionType,
        summary:
          run.status === "failed" ? `${summary} (failed)` : summary,
        timestamp: run.created_at,
      };
    });

  // Merge and sort by timestamp descending
  const events = [...traceEvents, ...runEvents]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);

  const agentNames = agents.map((a) => a.display_name);

  return { events, agentNames };
}
