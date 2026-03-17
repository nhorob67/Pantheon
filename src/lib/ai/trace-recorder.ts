import type { SupabaseClient } from "@supabase/supabase-js";

export interface GuardrailSummary {
  totalInvocations: number;
  totalTokens: number;
  totalSpendCents: number;
  elapsedMs: number;
  halted: boolean;
  haltReason: string | null;
  eventCount: number;
  warningCount: number;
  haltCount: number;
  /** Phase 6: Per-event detail for observability drill-down */
  events?: Array<{
    kind: string;
    toolName: string | null;
    threshold: number;
    actual: number;
    action: "warn" | "halt";
    message: string;
    timestamp: number;
  }>;
}

export interface WebCitation {
  url: string;
  title: string | null;
  snippet: string | null;
  fetched_at: string;
  tool: "web_search" | "web_fetch";
}

export interface DelegationEvent {
  parent_agent_id: string;
  parent_agent_name: string;
  child_agent_id: string;
  child_agent_name: string;
  task: string;
  success: boolean;
  child_run_id?: string | null;
  depth: number;
  delegation_kind?: "sync" | "async";
}

export interface BrowserSessionTrace {
  session_id: string;
  action_count: number;
  duration_ms: number;
  status: string;
  urls_visited: string[];
  artifact_count: number;
}

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
  webCitations?: WebCitation[];
  delegationEvents?: DelegationEvent[];
  browserSessions?: BrowserSessionTrace[];
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalLatencyMs: number;
  guardrailSummary?: GuardrailSummary | null;
}

/**
 * Extract web citations from unified executor invocation records.
 * Parses outputSummary JSON from web_search and web_fetch tool calls
 * to build a deduplicated citation list for trace persistence.
 */
export function extractWebCitations(
  records: ReadonlyArray<{ toolName: string; success: boolean; outputSummary: string }>
): WebCitation[] {
  const seen = new Set<string>();
  const citations: WebCitation[] = [];

  for (const r of records) {
    if (!r.success) continue;

    if (r.toolName === "web_search") {
      try {
        const output = JSON.parse(r.outputSummary);
        const fetchedAt = output.fetched_at ?? new Date().toISOString();
        const results = Array.isArray(output.results) ? output.results : [];
        for (const result of results) {
          const url = result.url;
          if (!url || typeof url !== "string" || seen.has(url)) continue;
          seen.add(url);
          citations.push({
            url,
            title: result.title ?? null,
            snippet: result.snippet ?? null,
            fetched_at: fetchedAt,
            tool: "web_search",
          });
        }
      } catch {
        // outputSummary may be truncated — skip silently
      }
    }

    if (r.toolName === "web_fetch") {
      try {
        const output = JSON.parse(r.outputSummary);
        const url = output.url;
        if (url && typeof url === "string" && !seen.has(url)) {
          seen.add(url);
          citations.push({
            url,
            title: output.title ?? null,
            snippet: output.description ?? null,
            fetched_at: output.fetched_at ?? new Date().toISOString(),
            tool: "web_fetch",
          });
        }
      } catch {
        // outputSummary may be truncated — skip silently
      }
    }
  }

  return citations;
}

/**
 * Extract delegation events from unified executor invocation records.
 * Parses outputSummary JSON from delegate_task tool calls.
 */
export function extractDelegationEvents(
  records: ReadonlyArray<{ toolName: string; success: boolean; inputSummary: string; outputSummary: string }>,
  parentAgentId: string,
  parentAgentName: string
): DelegationEvent[] {
  const events: DelegationEvent[] = [];

  for (const r of records) {
    const isSyncDelegation = r.toolName === "delegate_task";
    const isAsyncDelegation = r.toolName === "delegate_task_async";
    if (!isSyncDelegation && !isAsyncDelegation) continue;

    try {
      const input = JSON.parse(r.inputSummary);
      const output = JSON.parse(r.outputSummary);
      events.push({
        parent_agent_id: parentAgentId,
        parent_agent_name: parentAgentName,
        child_agent_id: isAsyncDelegation ? (input.agent_id ?? output.target_agent_id ?? "unknown") : (input.agent_id ?? "unknown"),
        child_agent_name: isAsyncDelegation ? (output.target_agent ?? "unknown") : (output.agent_name ?? "unknown"),
        task: input.task ?? "",
        success: isAsyncDelegation ? output.success === true : output.success === true,
        child_run_id: isAsyncDelegation ? (output.delegation_id ?? null) : (output.child_run_id ?? null),
        depth: output.delegation_depth ?? 1,
        delegation_kind: isAsyncDelegation ? "async" : "sync",
      });
    } catch {
      // outputSummary may be truncated — skip silently
    }
  }

  return events;
}

/**
 * Extract browser session data from unified executor invocation records.
 * Parses outputSummary JSON from browser_navigate tool calls to collect
 * URLs visited and build session summaries.
 */
export function extractBrowserSessions(
  records: ReadonlyArray<{ toolName: string; success: boolean; outputSummary: string }>
): BrowserSessionTrace[] {
  const urlsVisited = new Set<string>();
  let actionCount = 0;
  let sessionId: string | null = null;
  let artifactCount = 0;
  let status = "completed";

  for (const r of records) {
    if (!r.toolName.startsWith("browser_")) continue;
    actionCount++;

    try {
      const output = JSON.parse(r.outputSummary);
      if (typeof output.session_id === "string") {
        sessionId = output.session_id;
      }
      if (typeof output.artifact_count === "number") {
        artifactCount = Math.max(artifactCount, output.artifact_count);
      }
      if (typeof output.error === "string") {
        status = output.error === "approval_required" ? "awaiting_approval" : "failed";
      }
      if (output.url && typeof output.url === "string") {
        urlsVisited.add(output.url);
      }
      if (output.current_url && typeof output.current_url === "string") {
        urlsVisited.add(output.current_url);
      }
      if (output.page_state?.url) {
        urlsVisited.add(output.page_state.url);
      }
    } catch {
      // truncated output — skip
    }
  }

  if (actionCount === 0) return [];

  return [{
    session_id: sessionId ?? "unknown",
    action_count: actionCount,
    duration_ms: 0, // filled in by caller if needed
    status,
    urls_visited: Array.from(urlsVisited),
    artifact_count: artifactCount,
  }];
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
    web_citations: data.webCitations?.length ? data.webCitations : null,
    delegation_events: data.delegationEvents?.length ? data.delegationEvents : null,
    browser_sessions: data.browserSessions?.length ? data.browserSessions : null,
    model_id: data.modelId,
    input_tokens: data.inputTokens,
    output_tokens: data.outputTokens,
    total_latency_ms: data.totalLatencyMs,
    guardrail_summary: data.guardrailSummary ?? null,
  });
}
