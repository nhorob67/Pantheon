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
      parts.push(`### Overall summary\n${root.summary_text}`);
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
        ? ` (${new Date(l.message_time_end).toISOString().slice(0, 16)})`
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
