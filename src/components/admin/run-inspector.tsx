"use client";

import { useState } from "react";
import type { RunDetail } from "@/lib/queries/admin-observability";

interface RunInspectorProps {
  run: RunDetail;
}

export function RunInspector({ run }: RunInspectorProps) {
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
          <div className="mt-3 rounded-lg bg-red-500/5 border border-red-500/20 p-3">
            <p className="text-xs font-medium text-red-500 mb-1">Error</p>
            <p className="text-sm text-red-400">{run.error_message}</p>
          </div>
        )}
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
          {JSON.stringify(run.metadata, null, 2)}
        </pre>
      </CollapsibleSection>

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
        <h3 className="font-headline text-sm font-semibold text-foreground uppercase tracking-wider">
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
