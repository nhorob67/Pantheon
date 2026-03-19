import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateTokens } from "./history-loader";

export interface SummaryNode {
  id: string;
  session_id: string;
  parent_node_id: string | null;
  depth: number;
  summary_text: string;
  source_message_ids: string[];
  source_node_ids: string[];
  token_count: number;
  message_time_start: string | null;
  message_time_end: string | null;
  created_at: string;
}

const DEFAULT_SUMMARY_TOKEN_BUDGET = 2000;

/**
 * Load the summary DAG for a session, returning nodes ordered by depth desc then created_at desc.
 */
export async function loadSummaryDAG(
  admin: SupabaseClient,
  sessionId: string
): Promise<SummaryNode[]> {
  const { data, error } = await admin
    .from("session_summary_nodes")
    .select("*")
    .eq("session_id", sessionId)
    .order("depth", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SummaryNode[];
}

/**
 * Assemble summary context from the DAG for injection into the system prompt.
 *
 * Strategy: include the highest-depth node (broadest summary) first,
 * then fill remaining budget with the most recent leaf nodes (depth 0).
 * This gives the model both a big-picture view and recent detail.
 */
export async function assembleSummaryContext(
  admin: SupabaseClient,
  sessionId: string,
  tokenBudget: number = DEFAULT_SUMMARY_TOKEN_BUDGET
): Promise<{ text: string; tokenCount: number; nodeIds: string[] }> {
  const nodes = await loadSummaryDAG(admin, sessionId);
  if (nodes.length === 0) {
    return { text: "", tokenCount: 0, nodeIds: [] };
  }

  const parts: string[] = [];
  const usedIds: string[] = [];
  let remaining = tokenBudget;

  // 1. Highest-depth node (broadest summary)
  const maxDepth = nodes[0].depth;
  const rootNodes = nodes.filter((n) => n.depth === maxDepth);

  if (rootNodes.length > 0) {
    const root = rootNodes[0];
    const tokens = root.token_count || estimateTokens(root.summary_text);
    if (tokens <= remaining) {
      const rangeLabel = formatTimeRange(root.message_time_start, root.message_time_end);
      parts.push(`### Overall summary${rangeLabel}\n${root.summary_text}`);
      usedIds.push(root.id);
      remaining -= tokens;
    }
  }

  // 2. Recent leaf nodes (depth 0) for detailed recent context
  const leaves = nodes
    .filter((n) => n.depth === 0 && !usedIds.includes(n.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const recentLeaves: SummaryNode[] = [];
  for (const leaf of leaves) {
    const tokens = leaf.token_count || estimateTokens(leaf.summary_text);
    if (tokens > remaining) break;
    recentLeaves.push(leaf);
    remaining -= tokens;
  }

  if (recentLeaves.length > 0) {
    // Show in chronological order
    recentLeaves.reverse();
    const leafTexts = recentLeaves.map((l) => {
      const timeLabel = l.message_time_end
        ? ` [${formatFriendlyTimestamp(l.message_time_end)}]`
        : "";
      return `- ${l.summary_text}${timeLabel}`;
    });
    parts.push(`### Recent conversation detail\n${leafTexts.join("\n")}`);
    usedIds.push(...recentLeaves.map((l) => l.id));
  }

  const text = parts.join("\n\n");
  return {
    text,
    tokenCount: tokenBudget - remaining,
    nodeIds: usedIds,
  };
}

const CROSS_SESSION_TOKEN_BUDGET = 500;

/**
 * Load the most recent cross-session bridge summaries for an agent.
 * These carry narrative context from previous conversations.
 */
export async function loadBridgeSummaries(
  admin: SupabaseClient,
  tenantId: string,
  agentId: string | null,
  currentSessionId: string,
  tokenBudget: number = CROSS_SESSION_TOKEN_BUDGET
): Promise<{ text: string; tokenCount: number }> {
  // Load bridges for this agent (or tenant-wide if no agent), excluding current session
  let query = admin
    .from("tenant_summary_bridges")
    .select("summary_text, token_count, time_start, time_end, source_session_id")
    .eq("tenant_id", tenantId)
    .neq("source_session_id", currentSessionId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return { text: "", tokenCount: 0 };
  }

  const parts: string[] = [];
  let remaining = tokenBudget;

  for (const bridge of data) {
    const tokens = bridge.token_count || estimateTokens(bridge.summary_text);
    if (tokens > remaining) break;
    const rangeLabel = formatTimeRange(bridge.time_start, bridge.time_end);
    parts.push(`- ${bridge.summary_text}${rangeLabel}`);
    remaining -= tokens;
  }

  if (parts.length === 0) {
    return { text: "", tokenCount: 0 };
  }

  const text = `### Background from previous conversations\n${parts.join("\n")}`;
  return { text, tokenCount: tokenBudget - remaining };
}

/**
 * Validate DAG integrity for a session. Returns a list of issues found.
 */
export async function validateSummaryDAG(
  admin: SupabaseClient,
  sessionId: string
): Promise<string[]> {
  const nodes = await loadSummaryDAG(admin, sessionId);
  const issues: string[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    // Parent-child depth consistency
    if (node.parent_node_id) {
      const parent = nodeMap.get(node.parent_node_id);
      if (!parent) {
        issues.push(`Node ${node.id} references missing parent ${node.parent_node_id}`);
      } else if (parent.depth !== node.depth + 1) {
        issues.push(
          `Node ${node.id} (depth ${node.depth}) has parent ${parent.id} (depth ${parent.depth}), expected depth ${node.depth + 1}`
        );
      }
    }

    // Token count sanity
    if (node.token_count < 0) {
      issues.push(`Node ${node.id} has negative token_count: ${node.token_count}`);
    }

    // Leaf nodes should have source messages, condensed nodes should have source nodes
    if (node.depth === 0 && node.source_message_ids.length === 0) {
      issues.push(`Leaf node ${node.id} has no source_message_ids`);
    }
    if (node.depth > 0 && node.source_node_ids.length === 0) {
      issues.push(`Condensed node ${node.id} (depth ${node.depth}) has no source_node_ids`);
    }
  }

  return issues;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Format a timestamp as a friendly short label, e.g. "Mar 18, 2:30 PM"
 */
function formatFriendlyTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * Format a time range for condensed/root nodes, e.g. " [Jan 15 – Mar 18, 2026]"
 * Returns empty string if no timestamps available.
 */
function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  if (start && end) {
    const s = fmt(start);
    const e = fmt(end);
    return s === e ? ` [${s}]` : ` [${s} – ${e}]`;
  }
  return ` [${fmt(start ?? end!)}]`;
}

/**
 * Format a time range for condensed nodes in the DAG display.
 * Exported for use by the history exploration tool.
 */
export { formatTimeRange, formatFriendlyTimestamp };
