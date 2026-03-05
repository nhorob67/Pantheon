"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { SCHEDULE_TEMPLATES, type ScheduleTemplate } from "@/lib/schedules/schedule-templates";

interface AgentOption {
  id: string;
  display_name: string;
  discord_channel_id: string | null;
}

interface EditSchedule {
  id: string;
  display_name: string;
  prompt: string;
  cron_expression: string;
  timezone: string;
  tools: string[];
  enabled: boolean;
}

interface ScheduleFormDialogProps {
  tenantId: string;
  agents: AgentOption[];
  editSchedule?: EditSchedule;
  prefilledAgentId?: string;
  customCount?: number;
  onClose: () => void;
}

const TIMEZONE_OPTIONS = [
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Winnipeg", label: "Central Canada" },
  { value: "America/Regina", label: "Saskatchewan" },
];

const TOOL_OPTIONS = [
  { value: "farm-weather", label: "Weather" },
  { value: "farm-grain-bids", label: "Grain Bids" },
  { value: "farm-scale-tickets", label: "Scale Tickets" },
];

const FREQUENCY_PRESETS = [
  { label: "Every day", cron: (h: number, m: number) => `${m} ${h} * * *` },
  { label: "Every weekday", cron: (h: number, m: number) => `${m} ${h} * * 1-5` },
  { label: "Every Monday", cron: (h: number, m: number) => `${m} ${h} * * 1` },
  { label: "Every Tuesday", cron: (h: number, m: number) => `${m} ${h} * * 2` },
  { label: "Every Wednesday", cron: (h: number, m: number) => `${m} ${h} * * 3` },
  { label: "Every Thursday", cron: (h: number, m: number) => `${m} ${h} * * 4` },
  { label: "Every Friday", cron: (h: number, m: number) => `${m} ${h} * * 5` },
  { label: "Every Saturday", cron: (h: number, m: number) => `${m} ${h} * * 6` },
  { label: "Custom cron", cron: null },
];

export function ScheduleFormDialog({
  tenantId,
  agents,
  editSchedule,
  prefilledAgentId,
  customCount = 0,
  onClose,
}: ScheduleFormDialogProps) {
  const router = useRouter();
  const isEditing = !!editSchedule;

  const [displayName, setDisplayName] = useState(editSchedule?.display_name ?? "");
  const [prompt, setPrompt] = useState(editSchedule?.prompt ?? "");
  const [frequencyIdx, setFrequencyIdx] = useState<number>(
    editSchedule ? FREQUENCY_PRESETS.length - 1 : 0
  );
  const [hour, setHour] = useState(() => {
    if (editSchedule) {
      const parts = editSchedule.cron_expression.split(/\s+/);
      return parseInt(parts[1] || "7", 10);
    }
    return 7;
  });
  const [minute, setMinute] = useState(() => {
    if (editSchedule) {
      const parts = editSchedule.cron_expression.split(/\s+/);
      return parseInt(parts[0] || "0", 10);
    }
    return 0;
  });
  const [customCron, setCustomCron] = useState(editSchedule?.cron_expression ?? "");
  const [timezone, setTimezone] = useState(editSchedule?.timezone ?? "America/Chicago");
  const [agentId, setAgentId] = useState(prefilledAgentId ?? agents[0]?.id ?? "");
  const [channelId, setChannelId] = useState(() => {
    if (prefilledAgentId) {
      const agent = agents.find((a) => a.id === prefilledAgentId);
      return agent?.discord_channel_id ?? "";
    }
    return agents[0]?.discord_channel_id ?? "";
  });
  const [tools, setTools] = useState<string[]>(editSchedule?.tools ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustomCron = frequencyIdx === FREQUENCY_PRESETS.length - 1;
  const cronExpression = isCustomCron
    ? customCron
    : FREQUENCY_PRESETS[frequencyIdx].cron!(hour, minute);

  function applyTemplate(template: ScheduleTemplate) {
    setDisplayName(template.display_name);
    setPrompt(template.prompt);
    setTools(template.tools);
    // Parse cron to set hour/minute/frequency
    const parts = template.cron_expression.split(/\s+/);
    setMinute(parseInt(parts[0] || "0", 10));
    setHour(parseInt(parts[1] || "7", 10));
    setCustomCron(template.cron_expression);
    // Try to match a frequency preset
    const dow = parts[4];
    if (dow === "*") setFrequencyIdx(0);
    else if (dow === "1-5") setFrequencyIdx(1);
    else if (dow === "1-6") setFrequencyIdx(FREQUENCY_PRESETS.length - 1);
    else setFrequencyIdx(FREQUENCY_PRESETS.length - 1);
  }

  function handleAgentChange(id: string) {
    setAgentId(id);
    const agent = agents.find((a) => a.id === id);
    if (agent?.discord_channel_id) {
      setChannelId(agent.discord_channel_id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isEditing) {
        const res = await fetch(
          `/api/tenants/${tenantId}/schedules/${editSchedule.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              display_name: displayName,
              prompt,
              cron_expression: cronExpression,
              timezone,
              tools,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update schedule");
        }
      } else {
        const res = await fetch(`/api/tenants/${tenantId}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: displayName,
            prompt,
            cron_expression: cronExpression,
            timezone,
            agent_id: agentId,
            channel_id: channelId,
            tools,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create schedule");
        }
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-headline text-base font-semibold">
            {isEditing ? "Edit Schedule" : "Create Schedule"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Templates (create only) */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1.5">
                Quick Start Templates
              </label>
              <div className="flex gap-2 flex-wrap">
                {SCHEDULE_TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="px-2 py-1 text-xs rounded-md bg-muted text-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors"
                  >
                    {t.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Display name */}
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Check field moisture"
              required
              maxLength={100}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="The instruction your agent follows when this fires..."
              required
              maxLength={2000}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">
              Frequency
            </label>
            <select
              value={frequencyIdx}
              onChange={(e) => setFrequencyIdx(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {FREQUENCY_PRESETS.map((preset, idx) => (
                <option key={idx} value={idx}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time picker (for preset frequencies) */}
          {!isCustomCron && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-foreground/60 mb-1.5">
                  Hour
                </label>
                <select
                  value={hour}
                  onChange={(e) => setHour(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0
                        ? "12 AM"
                        : i < 12
                        ? `${i} AM`
                        : i === 12
                        ? "12 PM"
                        : `${i - 12} PM`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-foreground/60 mb-1.5">
                  Minute
                </label>
                <select
                  value={minute}
                  onChange={(e) => setMinute(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      :{String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Custom cron input */}
          {isCustomCron && (
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1.5">
                Cron Expression
              </label>
              <input
                type="text"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 7 * * 2"
                required
                className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-[10px] text-foreground/40 mt-1">
                Format: minute hour day-of-month month day-of-week
              </p>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Agent (create only) */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1.5">
                Agent
              </label>
              <select
                value={agentId}
                onChange={(e) => handleAgentChange(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Channel ID (create only) */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1.5">
                Channel ID
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="Discord channel ID"
                required
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Tools */}
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1.5">
              Tools (optional)
            </label>
            <div className="flex gap-3">
              {TOOL_OPTIONS.map((t) => (
                <label key={t.value} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={tools.includes(t.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTools([...tools, t.value]);
                      } else {
                        setTools(tools.filter((x) => x !== t.value));
                      }
                    }}
                    className="rounded border-border"
                  />
                  {t.label}
                </label>
              ))}
            </div>
            <p className="text-[10px] text-foreground/40 mt-1">
              Scope this job to specific tools. Leave empty for all available tools.
            </p>
          </div>

          {/* Cron preview */}
          <div className="bg-background rounded-lg p-3 text-xs text-foreground/60">
            <span className="font-medium text-foreground/80">Preview: </span>
            <code className="font-mono">{cronExpression}</code>
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!isEditing && customCount >= 25)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                ? "Save Changes"
                : "Create Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
