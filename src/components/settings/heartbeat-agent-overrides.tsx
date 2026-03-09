"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  HeartbeatConfigEditor,
  createHeartbeatConfigDraft,
  type HeartbeatConfigDraft,
} from "./heartbeat-config-editor";
import type { HeartbeatConfig } from "@/types/heartbeat";

interface Agent {
  id: string;
  display_name: string;
  discord_channel_id: string | null;
}

interface HeartbeatAgentOverridesProps {
  tenantId: string;
  agents: Agent[];
  overrides: HeartbeatConfig[];
  channelOptions: Array<{ value: string; label: string }>;
  defaultTemplate: HeartbeatConfigDraft;
  configStats: {
    config_id: string;
    recent_deliveries_24h: number;
    recent_suppressed_24h: number;
    active_issue_count: number;
  }[];
}

function toDraft(config: HeartbeatConfig | null, fallback: HeartbeatConfigDraft): HeartbeatConfigDraft {
  if (!config) {
    return createHeartbeatConfigDraft(fallback);
  }

  return createHeartbeatConfigDraft({
    enabled: config.enabled,
    interval_minutes: config.interval_minutes,
    timezone: config.timezone,
    active_hours_start: config.active_hours_start,
    active_hours_end: config.active_hours_end,
    checks: config.checks,
    custom_checks: config.custom_checks,
    delivery_channel_id: config.delivery_channel_id ?? "",
    cooldown_minutes: config.cooldown_minutes,
    max_alerts_per_day: config.max_alerts_per_day,
    digest_enabled: config.digest_enabled,
    digest_window_minutes: config.digest_window_minutes,
    reminder_interval_minutes: config.reminder_interval_minutes,
    heartbeat_instructions: config.heartbeat_instructions,
  });
}

export function HeartbeatAgentOverrides({
  tenantId,
  agents,
  overrides: initialOverrides,
  channelOptions,
  defaultTemplate,
  configStats,
}: HeartbeatAgentOverridesProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [overrides, setOverrides] = useState(initialOverrides);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, HeartbeatConfigDraft>>({});
  const [savingAgent, setSavingAgent] = useState<string | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null);

  const statsByConfigId = new Map(configStats.map((stat) => [stat.config_id, stat]));
  const agentsWithOverrides = agents.map((agent) => ({
    ...agent,
    override: overrides.find((entry) => entry.agent_id === agent.id) || null,
  }));

  const getDraft = (agentId: string, override: HeartbeatConfig | null) =>
    drafts[agentId] || toDraft(override, defaultTemplate);

  const updateDraft = (agentId: string, next: HeartbeatConfigDraft) => {
    setDrafts((prev) => ({ ...prev, [agentId]: next }));
  };

  const saveOverride = async (
    agentId: string,
    override: HeartbeatConfig | null,
    nextDraft?: HeartbeatConfigDraft
  ) => {
    const draft = nextDraft || getDraft(agentId, override);
    setSavingAgent(agentId);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/heartbeat/agents/${agentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: draft.enabled,
            interval_minutes: draft.interval_minutes,
            timezone: draft.timezone,
            active_hours_start: draft.active_hours_start,
            active_hours_end: draft.active_hours_end,
            checks: draft.checks,
            custom_checks: draft.custom_checks,
            delivery_channel_id: draft.delivery_channel_id || null,
            cooldown_minutes: draft.cooldown_minutes,
            max_alerts_per_day: draft.max_alerts_per_day,
            digest_enabled: draft.digest_enabled,
            digest_window_minutes: draft.digest_window_minutes,
            reminder_interval_minutes: draft.reminder_interval_minutes,
            heartbeat_instructions: draft.heartbeat_instructions,
          }),
        }
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error?.message || "Failed to save override");
      }

      const config = payload.config as HeartbeatConfig;
      setOverrides((prev) => {
        const filtered = prev.filter((entry) => entry.agent_id !== agentId);
        return [...filtered, config];
      });
      setDrafts((prev) => ({ ...prev, [agentId]: toDraft(config, defaultTemplate) }));
      toast(override ? "Override updated" : "Override created", "success");
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to save override",
        "error"
      );
    } finally {
      setSavingAgent(null);
    }
  };

  const handleDelete = async (agentId: string) => {
    setDeletingAgent(agentId);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/heartbeat/agents/${agentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error("Failed to remove override");
      }

      setOverrides((prev) => prev.filter((entry) => entry.agent_id !== agentId));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
      toast("Override removed", "success");
      router.refresh();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to remove override",
        "error"
      );
    } finally {
      setDeletingAgent(null);
    }
  };

  if (agents.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-base font-semibold mb-1">
        Per-Agent Overrides
      </h3>
      <p className="text-xs text-foreground/50 mb-4">
        Enabled overrides add agent-scoped unanswered-email monitoring for that agent. Farm-wide weather, grain, ticket, and custom checks stay on the tenant-default heartbeat.
      </p>

      <div className="space-y-3">
        {agentsWithOverrides.map((agent) => {
          const draft = getDraft(agent.id, agent.override);
          const overrideStats = agent.override
            ? statsByConfigId.get(agent.override.id)
            : null;

          return (
            <div
              key={agent.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedAgent(expandedAgent === agent.id ? null : agent.id)
                }
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedAgent === agent.id ? (
                    <ChevronDown className="w-3.5 h-3.5 text-foreground/40" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-foreground/40" />
                  )}
                  <span className="font-medium">{agent.display_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      agent.override
                        ? agent.override.enabled
                          ? "bg-[#D98C2E]/10 text-[#D98C2E]"
                          : "bg-muted text-foreground/50"
                        : "bg-muted text-foreground/40"
                    }`}
                  >
                    {agent.override
                      ? agent.override.enabled
                        ? "Custom active"
                        : "Custom paused"
                      : "Using default"}
                  </span>
                </div>
              </button>

              {expandedAgent === agent.id && (
                <div className="px-4 pb-4 border-t border-border space-y-4">
                  <div className="pt-3 flex flex-wrap gap-2 text-xs text-foreground/55">
                    <span>
                      {agent.override
                        ? `Deliveries last 24h: ${overrideStats?.recent_deliveries_24h ?? 0}/${agent.override.max_alerts_per_day}`
                        : "No saved override yet"}
                    </span>
                    {agent.override && (
                      <>
                        <span>
                          Suppressed last 24h: {overrideStats?.recent_suppressed_24h ?? 0}
                        </span>
                        <span>
                          Active issues: {overrideStats?.active_issue_count ?? 0}
                        </span>
                      </>
                    )}
                  </div>

                  {!agent.override && (
                    <p className="text-xs text-foreground/50">
                      This agent currently inherits the tenant default. Saving below creates a
                      standalone override for this agent.
                    </p>
                  )}

                  <HeartbeatConfigEditor
                    value={draft}
                    onChange={(next) => updateDraft(agent.id, next)}
                    channelOptions={channelOptions}
                    headingPrefix={agent.display_name}
                    scopeMode="agent_override"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveOverride(agent.id, agent.override)}
                      disabled={savingAgent !== null || deletingAgent !== null}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {savingAgent === agent.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : agent.override ? (
                        <Plus className="h-3.5 w-3.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {agent.override ? "Save override" : "Create override"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        saveOverride(agent.id, agent.override, {
                          ...draft,
                          enabled: !draft.enabled,
                        })
                      }
                      disabled={savingAgent !== null || deletingAgent !== null}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {savingAgent === agent.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      {draft.enabled ? "Pause override" : "Resume override"}
                    </button>
                    {agent.override && (
                      <button
                        type="button"
                        onClick={() => handleDelete(agent.id)}
                        disabled={savingAgent !== null || deletingAgent !== null}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingAgent === agent.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Remove override
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
