"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldAlert, ShieldCheck, ShieldOff, GitBranch, Globe, Image as ImageIcon, ChevronDown, ChevronRight, RotateCcw, Play, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RunDetail, ChildRunSummary } from "@/lib/queries/admin-observability";

interface RunInspectorProps {
  run: RunDetail;
  childRuns?: ChildRunSummary[];
}

export function RunInspector({ run, childRuns }: RunInspectorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview"])
  );

  function toggle(section: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  const latencyMs =
    run.started_at && run.completed_at
      ? new Date(run.completed_at).getTime() -
        new Date(run.started_at).getTime()
      : null;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <CollapsibleSection
        title="Overview"
        id="overview"
        expanded={expandedSections.has("overview")}
        onToggle={toggle}
      >
        <div className="grid gap-3 md:grid-cols-2 text-sm">
          <Field label="Status" value={run.status} />
          <Field label="Kind" value={run.run_kind} />
          <Field label="Tenant" value={run.tenant_id} mono />
          <Field label="Customer" value={run.customer_id} mono />
          <Field label="Attempts" value={String(run.attempt_count)} />
          <Field
            label="Latency"
            value={latencyMs != null ? `${latencyMs}ms` : "—"}
          />
          <Field
            label="Created"
            value={new Date(run.created_at).toLocaleString()}
          />
          <Field
            label="Completed"
            value={
              run.completed_at
                ? new Date(run.completed_at).toLocaleString()
                : "—"
            }
          />
        </div>
        {run.error_message && (
          <div className="mt-3 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <p className="text-xs font-medium text-destructive mb-1">Error</p>
            <p className="text-sm text-destructive">{run.error_message}</p>
          </div>
        )}
        <RunActions
          runId={run.id}
          status={run.status}
          showCancelTree={Boolean(childRuns && childRuns.length > 0)}
        />
      </CollapsibleSection>

      {/* Payload */}
      <CollapsibleSection
        title="Payload"
        id="payload"
        expanded={expandedSections.has("payload")}
        onToggle={toggle}
      >
        <pre className="text-xs font-mono text-foreground/80 bg-background rounded-lg p-3 overflow-auto max-h-80">
          {JSON.stringify(run.payload, null, 2)}
        </pre>
      </CollapsibleSection>

      {/* Result */}
      <CollapsibleSection
        title="Result"
        id="result"
        expanded={expandedSections.has("result")}
        onToggle={toggle}
      >
        <pre className="text-xs font-mono text-foreground/80 bg-background rounded-lg p-3 overflow-auto max-h-80">
          {JSON.stringify(run.result, null, 2)}
        </pre>
      </CollapsibleSection>

      {/* Metadata */}
      <CollapsibleSection
        title="Metadata"
        id="metadata"
        expanded={expandedSections.has("metadata")}
        onToggle={toggle}
      >
        <pre className="text-xs font-mono text-foreground/80 bg-background rounded-lg p-3 overflow-auto max-h-80">
          {JSON.stringify(run.metadata as Record<string, unknown> ?? {}, null, 2)}
        </pre>
      </CollapsibleSection>

      {/* Tool Invocations */}
      {run.invocations.length > 0 && (
        <CollapsibleSection
          title={`Tool Invocations (${run.invocations.length})`}
          id="invocations"
          expanded={expandedSections.has("invocations")}
          onToggle={toggle}
        >
          <div className="space-y-2">
            {run.invocations.map((inv) => (
              <InvocationRow key={inv.id} invocation={inv} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Guardrail Events */}
      {run.guardrail_events.length > 0 && (
        <CollapsibleSection
          title={`Guardrail Events (${run.guardrail_events.length})`}
          id="guardrails"
          expanded={expandedSections.has("guardrails")}
          onToggle={toggle}
        >
          <div className="space-y-2">
            {run.guardrail_events.map((event) => (
              <div
                key={event.id}
                className={`rounded-lg border p-3 text-sm ${
                  event.action === "halt"
                    ? "border-destructive/20 bg-destructive/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={event.action === "halt" ? "error" : "neutral"}>
                    {event.action}
                  </Badge>
                  <span className="font-mono text-xs text-foreground/60">
                    {event.event_kind}
                  </span>
                  {event.tool_name && (
                    <span className="text-xs text-foreground/50">
                      {event.tool_name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground/70">{event.message}</p>
                <p className="text-xs text-foreground/40 mt-1">
                  threshold: {event.threshold} | actual: {event.actual}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Delegation Tree */}
      {childRuns && childRuns.length > 0 && (
        <CollapsibleSection
          title={`Delegation Tree (${countChildRuns(childRuns)})`}
          id="delegation-tree"
          expanded={expandedSections.has("delegation-tree")}
          onToggle={toggle}
        >
          <div className="space-y-2">
            {childRuns.map((child) => (
              <DelegationTreeNodeRow key={child.id} child={child} depth={0} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Browser Sessions */}
      {run.trace && !!(run.trace as Record<string, unknown>).browser_sessions && (
        <CollapsibleSection
          title="Browser Sessions"
          id="browser-sessions"
          expanded={expandedSections.has("browser-sessions")}
          onToggle={toggle}
        >
          <BrowserSessionsPanel
            tenantId={run.tenant_id}
            sessions={
              ((run.trace as Record<string, unknown>).browser_sessions ?? []) as Array<{
                session_id: string;
                action_count: number;
                duration_ms: number;
                status: string;
                urls_visited: string[];
                artifact_count: number;
              }>
            }
          />
        </CollapsibleSection>
      )}

      {/* Trace */}
      {run.trace && (
        <CollapsibleSection
          title="Conversation Trace"
          id="trace"
          expanded={expandedSections.has("trace")}
          onToggle={toggle}
        >
          <pre className="text-xs font-mono text-foreground/80 bg-background rounded-lg p-3 overflow-auto max-h-80">
            {JSON.stringify(run.trace, null, 2)}
          </pre>
        </CollapsibleSection>
      )}
    </div>
  );
}

function countChildRuns(nodes: ChildRunSummary[]): number {
  let total = 0;

  for (const node of nodes) {
    total += 1;
    total += countChildRuns(node.children);
  }

  return total;
}

function DelegationTreeNodeRow({
  child,
  depth,
}: {
  child: ChildRunSummary;
  depth: number;
}) {
  const latencyLabel = child.latency_ms != null ? `${child.latency_ms}ms` : "—";
  const paddingClass = depth > 0 ? "ml-4 border-l border-border/70 pl-4" : "";

  return (
    <div className={`space-y-2 ${paddingClass}`}>
      <div className="rounded-lg border border-border p-3 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-foreground/40" />
            <span className="font-mono text-foreground/80">
              {child.target_agent_name ?? "Unknown Agent"}
            </span>
            {child.delegation_kind && (
              <Badge variant="neutral">{child.delegation_kind}</Badge>
            )}
            <Badge
              variant={
                child.status === "completed"
                  ? "success"
                  : child.status === "failed"
                    ? "error"
                    : child.status === "canceled"
                      ? "error"
                      : "neutral"
              }
            >
              {child.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-foreground/40">
            <span>depth {child.delegation_depth}</span>
            <span>{latencyLabel}</span>
          </div>
        </div>
        <p className="text-xs text-foreground/40 font-mono mt-1">{child.id}</p>
        <RunActions
          runId={child.id}
          status={child.status}
          showCancelTree={child.children.length > 0}
          compact
        />
      </div>

      {child.children.length > 0 && (
        <div className="space-y-2">
          {child.children.map((nestedChild) => (
            <DelegationTreeNodeRow
              key={nestedChild.id}
              child={nestedChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  id,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  id: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <h3 className="font-mono text-[11px] text-foreground uppercase tracking-[0.12em]">
          {title}
        </h3>
        <span className="text-foreground/40 text-xs">
          {expanded ? "Collapse" : "Expand"}
        </span>
      </button>
      {expanded && <div className="px-6 pb-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-foreground/40">{label}</p>
      <p
        className={`text-foreground ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

const RISK_ICONS: Record<string, typeof Shield> = {
  low: ShieldCheck,
  medium: Shield,
  high: ShieldAlert,
  critical: ShieldOff,
};

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

const STATUS_VARIANTS: Record<string, "success" | "error" | "neutral" | "info"> = {
  completed: "success",
  failed: "error",
  rejected: "error",
  pending: "neutral",
  approved: "info",
};

function BrowserSessionsPanel({
  tenantId,
  sessions,
}: {
  tenantId: string;
  sessions: Array<{
    session_id: string;
    action_count: number;
    duration_ms: number;
    status: string;
    urls_visited: string[];
    artifact_count: number;
  }>;
}) {
  return (
    <div className="space-y-3">
      {sessions.map((session, i) => (
        <BrowserSessionRow
          key={session.session_id || i}
          tenantId={tenantId}
          session={session}
        />
      ))}
    </div>
  );
}

function BrowserSessionRow({
  tenantId,
  session,
}: {
  tenantId: string;
  session: {
    session_id: string;
    action_count: number;
    duration_ms: number;
    status: string;
    urls_visited: string[];
    artifact_count: number;
  };
}) {
  const [artifactsExpanded, setArtifactsExpanded] = useState(false);
  const [artifacts, setArtifacts] = useState<Array<{
    id: string;
    kind: string;
    storage_key: string;
    signed_url: string | null;
    metadata: Record<string, unknown>;
  }> | null>(null);
  const loading = artifactsExpanded && artifacts === null;

  useEffect(() => {
    if (!artifactsExpanded || artifacts !== null || !session.session_id) return;
    fetch(`/api/tenants/${tenantId}/browser-sessions/${session.session_id}/artifacts`)
      .then((res) => (res.ok ? res.json() : { artifacts: [] }))
      .then((data) =>
        setArtifacts(
          Array.isArray(data)
            ? data
            : Array.isArray(data?.artifacts)
              ? data.artifacts
              : []
        )
      )
      .catch(() => setArtifacts([]));
  }, [artifactsExpanded, artifacts, tenantId, session.session_id]);

  return (
    <div className="rounded-lg border border-border p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-foreground/40" />
          <span className="font-mono text-xs text-foreground/60">
            {session.session_id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={session.status === "completed" ? "success" : session.status === "failed" ? "error" : "neutral"}>
            {session.status}
          </Badge>
          <span className="text-xs text-foreground/40">
            {session.action_count} actions
          </span>
          {session.duration_ms > 0 && (
            <span className="text-xs text-foreground/40">
              {(session.duration_ms / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
      {session.urls_visited.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-foreground/40">URLs visited:</p>
          {session.urls_visited.map((url, j) => (
            <p key={j} className="text-xs font-mono text-foreground/60 truncate pl-2">
              {url}
            </p>
          ))}
        </div>
      )}
      {session.artifact_count > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setArtifactsExpanded(!artifactsExpanded)}
            className="flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground/80 transition-colors"
          >
            {artifactsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <ImageIcon className="w-3 h-3" />
            <span>{session.artifact_count} artifact{session.artifact_count !== 1 ? "s" : ""}</span>
          </button>
          {artifactsExpanded && (
            <div className="mt-2 space-y-2 pl-4">
              {loading && <p className="text-xs text-foreground/40">Loading artifacts...</p>}
              {artifacts?.map((artifact) => (
                <div key={artifact.id} className="rounded border border-border/50 p-2">
                  <p className="text-xs text-foreground/50 mb-1">
                    {artifact.kind}
                    {typeof artifact.metadata?.url === "string" && (
                      <span className="ml-2 font-mono">{artifact.metadata.url}</span>
                    )}
                  </p>
                  {artifact.kind === "screenshot" && artifact.signed_url ? (
                    <img
                      src={artifact.signed_url}
                      alt={`Screenshot artifact ${artifact.id}`}
                      className="rounded max-w-full border border-border/30"
                      style={{ maxWidth: "600px" }}
                    />
                  ) : artifact.signed_url ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-foreground/50 hover:text-foreground/80">
                        View {artifact.kind}
                      </summary>
                      <div className="mt-1 space-y-2">
                        <a
                          href={artifact.signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-xs text-primary hover:text-primary/80"
                        >
                          Open artifact
                        </a>
                        <pre className="p-2 bg-background rounded text-foreground/70 overflow-auto max-h-40">
                          {artifact.storage_key}
                        </pre>
                      </div>
                    </details>
                  ) : (
                    <p className="text-xs text-foreground/30">No preview available</p>
                  )}
                </div>
              ))}
              {artifacts?.length === 0 && !loading && (
                <p className="text-xs text-foreground/30">No artifacts found.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 6.3: Operator run controls
// ---------------------------------------------------------------------------

function RunActions({
  runId,
  status,
  showCancelTree = false,
  compact = false,
}: {
  runId: string;
  status: string;
  showCancelTree?: boolean;
  compact?: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const canTerminate = status === "running" || status === "queued" || status === "awaiting_approval";
  const canReplay = status === "failed" || status === "completed";
  const canResume = status === "failed";
  const canCancelTree = showCancelTree;

  if (!canTerminate && !canReplay && !canResume && !canCancelTree) return null;

  async function executeAction(action: string) {
    const label =
      action === "cancel_tree"
        ? "cancel this run and its delegation tree"
        : `${action} this run`;
    if (!confirm(`Are you sure you want to ${label}?`)) return;

    setPending(action);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/runs/${runId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setResult({
        ok: res.ok,
        message: data.message ?? data.error ?? "Unknown result",
      });
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={compact ? "mt-2 flex items-center gap-2 flex-wrap" : "mt-3 flex items-center gap-2 flex-wrap"}>
      {canTerminate && (
        <button
          type="button"
          onClick={() => executeAction("terminate")}
          disabled={pending !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          <Square className="w-3 h-3" />
          {pending === "terminate" ? "Terminating..." : "Terminate"}
        </button>
      )}
      {canCancelTree && (
        <button
          type="button"
          onClick={() => executeAction("cancel_tree")}
          disabled={pending !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
        >
          <Square className="w-3 h-3" />
          {pending === "cancel_tree" ? "Canceling tree..." : "Cancel Tree"}
        </button>
      )}
      {canReplay && (
        <button
          type="button"
          onClick={() => executeAction("replay")}
          disabled={pending !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground/70 hover:bg-muted/50 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3 h-3" />
          {pending === "replay" ? "Replaying..." : "Replay"}
        </button>
      )}
      {canResume && (
        <button
          type="button"
          onClick={() => executeAction("resume")}
          disabled={pending !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
        >
          <Play className="w-3 h-3" />
          {pending === "resume" ? "Resuming..." : "Resume"}
        </button>
      )}
      {result && (
        <span className={`text-xs ${result.ok ? "text-emerald-400" : "text-destructive"}`}>
          {result.message}
        </span>
      )}
    </div>
  );
}

function InvocationRow({
  invocation,
}: {
  invocation: import("@/lib/queries/admin-observability").RunInvocation;
}) {
  const riskLevel = invocation.tool?.risk_level ?? "low";
  const RiskIcon = RISK_ICONS[riskLevel] ?? Shield;
  const riskColor = RISK_COLORS[riskLevel] ?? "text-foreground/40";
  const category = (invocation.tool?.metadata?.category as string) ?? "";

  return (
    <div className="rounded-lg border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-foreground/80">
            {invocation.tool?.display_name ?? invocation.tool_key}
          </span>
          <span className="text-xs font-mono text-foreground/30">
            {invocation.tool_key}
          </span>
          {category && (
            <Badge variant="neutral">{category}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Risk tier */}
          <div className={`flex items-center gap-1 ${riskColor}`}>
            <RiskIcon className="w-3.5 h-3.5" />
            <span className="text-xs capitalize">{riskLevel}</span>
          </div>
          {/* Policy decision */}
          {invocation.policy_decision !== "allowed" && (
            <Badge variant={invocation.policy_decision === "denied" ? "error" : "neutral"}>
              {invocation.policy_decision}
            </Badge>
          )}
          {/* Status */}
          <Badge variant={STATUS_VARIANTS[invocation.status] ?? "neutral"}>
            {invocation.status}
          </Badge>
        </div>
      </div>
      {invocation.error_message && (
        <p className="text-xs text-destructive mt-1">{invocation.error_message}</p>
      )}
    </div>
  );
}
