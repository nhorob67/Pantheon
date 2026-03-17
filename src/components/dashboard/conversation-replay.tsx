"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, GitBranch, Globe, MessageCircle, Shield, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { GuardrailSummary, WebCitation } from "@/lib/ai/trace-recorder";

interface Message {
  id: string;
  direction: string;
  author_type: string;
  content: string;
  token_count: number | null;
  created_at: string;
}

interface Trace {
  id: string;
  agent_name: string | null;
  tools_available: string[];
  tools_invoked: Array<{
    name: string;
    input_summary: string;
    output_summary: string;
  }>;
  memories_referenced: Array<{
    id: string;
    content_preview: string;
    score: number;
  }>;
  knowledge_referenced: Array<{
    id: string;
    source: string;
    chunk_preview: string;
  }>;
  web_citations: WebCitation[] | null;
  delegation_events: Array<{
    parent_agent_name: string;
    child_agent_name: string;
    task: string;
    success: boolean;
    delegation_kind?: "sync" | "async";
    child_run_id?: string | null;
    depth: number;
  }> | null;
  model_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_latency_ms: number | null;
  guardrail_summary: GuardrailSummary | null;
  created_at: string;
}

function TraceMetadata({ trace }: { trace: Trace }) {
  return (
    <>
      <div className="flex gap-4 text-foreground/60">
        {trace.agent_name && <span>Agent: {trace.agent_name}</span>}
        {trace.model_id && <span>Model: {trace.model_id}</span>}
      </div>
      <div className="flex gap-4 text-foreground/60">
        {trace.input_tokens != null && (
          <span>Input: {trace.input_tokens.toLocaleString()} tokens</span>
        )}
        {trace.output_tokens != null && (
          <span>Output: {trace.output_tokens.toLocaleString()} tokens</span>
        )}
        {trace.total_latency_ms != null && (
          <span>Latency: {trace.total_latency_ms}ms</span>
        )}
      </div>
    </>
  );
}

function TraceGuardrailSummary({
  summary,
}: {
  summary: GuardrailSummary | null;
}) {
  if (!summary) return null;
  if (summary.eventCount === 0 && !summary.halted) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {summary.halted ? (
          <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <Shield className="w-3.5 h-3.5 text-amber-400" />
        )}
        <p className="font-medium text-foreground/80">Guardrails</p>
        {summary.halted && (
          <Badge variant="error">halted</Badge>
        )}
        {summary.warningCount > 0 && !summary.halted && (
          <Badge variant="neutral">{summary.warningCount} warning{summary.warningCount !== 1 ? "s" : ""}</Badge>
        )}
      </div>
      <div className="flex gap-4 text-foreground/50">
        <span>{summary.totalInvocations} tool calls</span>
        <span>{summary.totalTokens.toLocaleString()} tokens</span>
        <span>{(summary.elapsedMs / 1000).toFixed(1)}s</span>
        {summary.totalSpendCents > 0 && (
          <span>${(summary.totalSpendCents / 100).toFixed(2)}</span>
        )}
      </div>
      {summary.halted && summary.haltReason && (
        <p className="text-destructive mt-1">{summary.haltReason}</p>
      )}
    </div>
  );
}

function TraceToolsInvoked({
  tools,
}: {
  tools: Trace["tools_invoked"];
}) {
  if (!Array.isArray(tools) || tools.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-foreground/80 mb-1">Tools Used</p>
      <div className="space-y-1">
        {tools.map((t, i) => (
          <div key={i} className="rounded bg-card border border-border p-2">
            <p className="font-mono text-foreground/80">{t.name}</p>
            {t.input_summary && (
              <p className="text-foreground/50 mt-0.5">
                Input: {t.input_summary}
              </p>
            )}
            {t.output_summary && (
              <p className="text-foreground/50 mt-0.5">
                Output: {t.output_summary}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TraceMemories({
  memories,
}: {
  memories: Trace["memories_referenced"];
}) {
  if (!Array.isArray(memories) || memories.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-foreground/80 mb-1">Memories Used</p>
      <ul className="space-y-1">
        {memories.map((m, i) => (
          <li key={i} className="text-foreground/60 flex justify-between">
            <span className="truncate">{m.content_preview}</span>
            <span className="text-foreground/30 shrink-0 ml-2">
              {(m.score * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TraceKnowledge({
  knowledge,
}: {
  knowledge: Trace["knowledge_referenced"];
}) {
  if (!Array.isArray(knowledge) || knowledge.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-foreground/80 mb-1">Knowledge Used</p>
      <ul className="space-y-1">
        {knowledge.map((k, i) => (
          <li key={i} className="text-foreground/60">
            <span className="text-foreground/40">[{k.source}]</span>{" "}
            {k.chunk_preview}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TraceDelegations({
  delegations,
}: {
  delegations: Trace["delegation_events"];
}) {
  if (!Array.isArray(delegations) || delegations.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <GitBranch className="w-3.5 h-3.5 text-primary/60" />
        <p className="font-medium text-foreground/80">Delegations</p>
      </div>
      <div className="space-y-1.5">
        {delegations.map((d, i) => (
          <div key={i} className="rounded bg-card border border-border p-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium text-foreground/80">{d.child_agent_name}</span>
              <Badge variant={d.success ? "success" : "error"}>
                {d.success ? "success" : "failed"}
              </Badge>
              {d.delegation_kind && (
                <Badge variant="neutral">{d.delegation_kind}</Badge>
              )}
              <span className="text-foreground/30">depth {d.depth}</span>
            </div>
            <p className="text-foreground/50 line-clamp-2">{d.task}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TraceCitations({
  citations,
}: {
  citations: WebCitation[] | null;
}) {
  if (!Array.isArray(citations) || citations.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Globe className="w-3.5 h-3.5 text-primary/60" />
        <p className="font-medium text-foreground/80">Sources</p>
      </div>
      <ul className="space-y-1.5">
        {citations.map((c, i) => {
          const hostname = new URL(c.url).hostname;
          return (
          <li key={i} className="rounded bg-card border border-border p-2">
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium truncate"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              {c.title || hostname}
            </a>
            {c.snippet && (
              <p className="text-foreground/50 mt-0.5 line-clamp-2">
                {c.snippet}
              </p>
            )}
            <div className="flex gap-3 mt-0.5 text-foreground/30">
              <span>{hostname}</span>
              <span>{c.tool === "web_search" ? "search" : "fetched"}</span>
            </div>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

interface ConversationReplayProps {
  messages: Message[];
  traces: Trace[];
}

export function ConversationReplay({
  messages,
  traces,
}: ConversationReplayProps) {
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());

  function toggleTrace(traceId: string) {
    setExpandedTraces((prev) => {
      const next = new Set(prev);
      if (next.has(traceId)) next.delete(traceId);
      else next.add(traceId);
      return next;
    });
  }

  // Pre-compute trace lookup map: match outbound messages to closest trace within 30s
  const traceByMessageId = useMemo(() => {
    const map = new Map<string, Trace>();
    for (const msg of messages) {
      if (msg.direction !== "outbound") continue;
      const msgTime = new Date(msg.created_at).getTime();
      let closest: Trace | null = null;
      let closestDiff = Infinity;
      for (const trace of traces) {
        const diff = Math.abs(new Date(trace.created_at).getTime() - msgTime);
        if (diff < closestDiff && diff < 30_000) {
          closestDiff = diff;
          closest = trace;
        }
      }
      if (closest) map.set(msg.id, closest);
    }
    return map;
  }, [messages, traces]);

  if (messages.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <EmptyState
          icon={MessageCircle}
          title="No messages yet"
          description="Messages will appear here once the conversation begins."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isOutbound = msg.direction === "outbound";
        const trace = traceByMessageId.get(msg.id) ?? null;

        return (
          <div key={msg.id} className="space-y-1">
            <div
              className={`rounded-xl p-4 ${
                isOutbound
                  ? "bg-primary/5 border border-primary/20 ml-8"
                  : "bg-card border border-border mr-8"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground/40 uppercase tracking-wider">
                  {isOutbound ? "AI Assistant" : "User"}
                </span>
                <span className="text-xs text-foreground/40">
                  {formatDistanceToNow(new Date(msg.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>

            {trace && (
              <div className="ml-8">
                <button
                  onClick={() => toggleTrace(trace.id)}
                  className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors px-2 py-1"
                >
                  {expandedTraces.has(trace.id)
                    ? "Hide trace details"
                    : "Show trace details"}
                  {trace.total_latency_ms != null && (
                    <span className="ml-2 text-foreground/30">
                      {trace.total_latency_ms}ms
                    </span>
                  )}
                </button>

                {expandedTraces.has(trace.id) && (
                  <div className="mt-2 rounded-lg border border-border bg-background p-4 space-y-3 text-xs">
                    <TraceMetadata trace={trace} />
                    <TraceGuardrailSummary summary={trace.guardrail_summary} />
                    <TraceToolsInvoked tools={trace.tools_invoked} />
                    <TraceDelegations delegations={trace.delegation_events} />
                    <TraceCitations citations={trace.web_citations} />
                    <TraceMemories memories={trace.memories_referenced} />
                    <TraceKnowledge knowledge={trace.knowledge_referenced} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
