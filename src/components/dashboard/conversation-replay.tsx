"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

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
  model_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_latency_ms: number | null;
  created_at: string;
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
          description="No messages in this conversation."
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
                  {isOutbound ? "AI Assistant" : "Farmer"}
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
                    {/* Agent & Model */}
                    <div className="flex gap-4 text-foreground/60">
                      {trace.agent_name && (
                        <span>Agent: {trace.agent_name}</span>
                      )}
                      {trace.model_id && <span>Model: {trace.model_id}</span>}
                    </div>

                    {/* Tokens & Latency */}
                    <div className="flex gap-4 text-foreground/60">
                      {trace.input_tokens != null && (
                        <span>
                          Input: {trace.input_tokens.toLocaleString()} tokens
                        </span>
                      )}
                      {trace.output_tokens != null && (
                        <span>
                          Output: {trace.output_tokens.toLocaleString()} tokens
                        </span>
                      )}
                      {trace.total_latency_ms != null && (
                        <span>Latency: {trace.total_latency_ms}ms</span>
                      )}
                    </div>

                    {/* Tools Invoked */}
                    {Array.isArray(trace.tools_invoked) &&
                      trace.tools_invoked.length > 0 && (
                        <div>
                          <p className="font-medium text-foreground/80 mb-1">
                            Tools Used
                          </p>
                          <div className="space-y-1">
                            {trace.tools_invoked.map((t, i) => (
                              <div
                                key={i}
                                className="rounded bg-card border border-border p-2"
                              >
                                <p className="font-mono text-foreground/80">
                                  {t.name}
                                </p>
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
                      )}

                    {/* Memories Referenced */}
                    {Array.isArray(trace.memories_referenced) &&
                      trace.memories_referenced.length > 0 && (
                        <div>
                          <p className="font-medium text-foreground/80 mb-1">
                            Memories Used
                          </p>
                          <ul className="space-y-1">
                            {trace.memories_referenced.map((m, i) => (
                              <li
                                key={i}
                                className="text-foreground/60 flex justify-between"
                              >
                                <span className="truncate">
                                  {m.content_preview}
                                </span>
                                <span className="text-foreground/30 shrink-0 ml-2">
                                  {(m.score * 100).toFixed(0)}%
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {/* Knowledge Referenced */}
                    {Array.isArray(trace.knowledge_referenced) &&
                      trace.knowledge_referenced.length > 0 && (
                        <div>
                          <p className="font-medium text-foreground/80 mb-1">
                            Knowledge Used
                          </p>
                          <ul className="space-y-1">
                            {trace.knowledge_referenced.map((k, i) => (
                              <li key={i} className="text-foreground/60">
                                <span className="text-foreground/40">
                                  [{k.source}]
                                </span>{" "}
                                {k.chunk_preview}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
