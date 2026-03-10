"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BellRing, CheckCheck, Clock3 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useHeartbeatSettings } from "./heartbeat-settings-context";
import type { HeartbeatIssue } from "@/types/heartbeat";

interface HeartbeatIssuesPanelProps {
  issues: HeartbeatIssue[];
}

function formatIssueTime(value: string | null): string {
  if (!value) {
    return "-";
  }

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

function getStateLabel(issue: HeartbeatIssue): string {
  if (issue.state === "snoozed" && issue.snoozed_until) {
    return `Snoozed until ${formatIssueTime(issue.snoozed_until)}`;
  }

  if (issue.state === "acknowledged") {
    return "Acknowledged";
  }

  return "New";
}

function getSeverityLabel(severity: number): string {
  if (severity >= 5) return "Critical";
  if (severity >= 4) return "High";
  if (severity >= 3) return "Moderate";
  return "Low";
}

export function HeartbeatIssuesPanel({
  issues: initialIssues,
}: HeartbeatIssuesPanelProps) {
  const { tenantId, agents, configs } = useHeartbeatSettings();
  const router = useRouter();
  const { toast } = useToast();
  const [issues, setIssues] = useState(initialIssues);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const agentNameById = new Map(agents.map((agent) => [agent.id, agent.display_name]));
  const configById = new Map(configs.map((config) => [config.id, config]));

  const getScopeLabel = (issue: HeartbeatIssue): string => {
    const config = configById.get(issue.config_id);
    const agentId = issue.agent_id ?? config?.agent_id ?? null;
    if (agentId) {
      return agentNameById.get(agentId) || "Agent override";
    }

    return "Tenant default";
  };

  const runAction = async (issue: HeartbeatIssue, action: "acknowledge" | "resolve" | "snooze", minutes?: number) => {
    const key = `${issue.id}:${action}:${minutes ?? ""}`;
    setRunningAction(key);
    try {
      const res = await fetch(
        action === "snooze"
          ? `/api/tenants/${tenantId}/heartbeat/issues/${issue.id}/snooze`
          : `/api/tenants/${tenantId}/heartbeat/issues/${issue.id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "snooze" ? JSON.stringify({ minutes }) : undefined,
        }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error?.message || `Failed to ${action} issue`);
      }

      const updatedIssue = payload.data?.issue as HeartbeatIssue | undefined;
      setIssues((prev) => {
        if (action === "resolve") {
          return prev.filter((entry) => entry.id !== issue.id);
        }

        return prev.map((entry) => (entry.id === issue.id && updatedIssue ? updatedIssue : entry));
      });
      toast(
        action === "acknowledge"
          ? "Issue acknowledged"
          : action === "resolve"
            ? "Issue resolved"
            : `Issue snoozed for ${minutes === 1440 ? "24h" : "4h"}`,
        "success"
      );
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : `Failed to ${action} issue`,
        "error"
      );
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <BellRing className="w-5 h-5 text-[#D98C2E]" />
        <div>
          <h3 className="font-headline text-base font-semibold">Active Issues</h3>
          <p className="text-xs text-foreground/50">
            Heartbeat tracks unresolved issues across runs so reminders and snoozes stay stateful.
          </p>
        </div>
      </div>

      {issues.length === 0 && (
        <p className="text-xs text-foreground/45">
          No active heartbeat issues right now.
        </p>
      )}

      {issues.length > 0 && (
        <div className="space-y-3">
          {issues.map((issue) => {
            const acknowledgeKey = `${issue.id}:acknowledge:`;
            const snooze4Key = `${issue.id}:snooze:240`;
            const snooze24Key = `${issue.id}:snooze:1440`;
            const resolveKey = `${issue.id}:resolve:`;

            return (
              <div
                key={issue.id}
                className="rounded-xl border border-border/70 bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center rounded-full bg-[#D98C2E]/10 px-2 py-0.5 font-medium text-[#D98C2E]">
                        {getScopeLabel(issue)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/60">
                        {issue.signal_type.replaceAll("_", " ")}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/60">
                        {getSeverityLabel(issue.severity)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80">
                      {issue.summary || "Heartbeat issue needs attention."}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-foreground/50">
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {getStateLabel(issue)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        First seen {formatIssueTime(issue.first_seen_at)}
                      </span>
                      <span>
                        Last seen {formatIssueTime(issue.last_seen_at)}
                      </span>
                      <span>
                        Last notified {formatIssueTime(issue.last_notified_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={runningAction !== null}
                      onClick={() => runAction(issue, "acknowledge")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      {runningAction === acknowledgeKey ? "Saving..." : "Acknowledge"}
                    </button>
                    <button
                      type="button"
                      disabled={runningAction !== null}
                      onClick={() => runAction(issue, "snooze", 240)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {runningAction === snooze4Key ? "Saving..." : "Snooze 4h"}
                    </button>
                    <button
                      type="button"
                      disabled={runningAction !== null}
                      onClick={() => runAction(issue, "snooze", 1440)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {runningAction === snooze24Key ? "Saving..." : "Snooze 24h"}
                    </button>
                    <button
                      type="button"
                      disabled={runningAction !== null}
                      onClick={() => runAction(issue, "resolve")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {runningAction === resolveKey ? "Saving..." : "Resolve"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
