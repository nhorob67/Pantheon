"use client";

import type {
  HeartbeatConfig,
  HeartbeatOperatorEvent,
  HeartbeatRun,
} from "@/types/heartbeat";

interface Agent {
  id: string;
  display_name: string;
}

interface HeartbeatOperatorHistoryPanelProps {
  events: HeartbeatOperatorEvent[];
  manualTests: HeartbeatRun[];
  configs: HeartbeatConfig[];
  agents: Agent[];
}

function formatTime(value: string): string {
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatLabel(value: string | null | undefined): string {
  return (value || "unknown").replaceAll("_", " ");
}

export function HeartbeatOperatorHistoryPanel({
  events,
  manualTests,
  configs,
  agents,
}: HeartbeatOperatorHistoryPanelProps) {
  const configById = new Map(configs.map((config) => [config.id, config]));
  const agentNameById = new Map(agents.map((agent) => [agent.id, agent.display_name]));

  const scopeLabelFor = (configId: string | null, agentId: string | null): string => {
    const resolvedAgentId = agentId ?? (configId ? configById.get(configId)?.agent_id ?? null : null);
    if (resolvedAgentId) {
      return agentNameById.get(resolvedAgentId) || "Agent override";
    }

    return "Tenant default";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-base font-semibold mb-1">Operator History</h3>
        <p className="text-xs text-foreground/50 mb-4">
          Pause/resume, manual actions, and issue triage are recorded here.
        </p>
        {events.length === 0 ? (
          <p className="text-xs text-foreground/40">No operator events yet.</p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 10).map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-border/70 bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">
                    {scopeLabelFor(event.config_id, event.agent_id)}
                  </span>
                  <span className="text-foreground/45">{formatTime(event.created_at)}</span>
                </div>
                <div className="mt-1 text-sm text-foreground/80">{event.summary}</div>
                <div className="mt-1 text-[11px] text-foreground/45">
                  {formatLabel(event.event_type)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-base font-semibold mb-1">Recent Tests</h3>
        <p className="text-xs text-foreground/50 mb-4">
          Manual test sends are listed separately so delivery outcomes are easier to inspect.
        </p>
        {manualTests.length === 0 ? (
          <p className="text-xs text-foreground/40">No heartbeat test sends yet.</p>
        ) : (
          <div className="space-y-2">
            {manualTests.map((run) => (
              <div
                key={run.id}
                className="rounded-xl border border-border/70 bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">
                    {scopeLabelFor(run.config_id, null)}
                  </span>
                  <span className="text-foreground/45">{formatTime(run.ran_at)}</span>
                </div>
                <div className="mt-1 text-sm text-foreground/80">
                  {formatLabel(run.delivery_status)}
                </div>
                {run.suppressed_reason && (
                  <div className="mt-1 text-[11px] text-foreground/45">
                    {formatLabel(run.suppressed_reason)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
