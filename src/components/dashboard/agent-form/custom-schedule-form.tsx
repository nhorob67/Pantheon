"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Loader2, Clock } from "lucide-react";
import { SCHEDULE_TEMPLATES, type ScheduleTemplate } from "@/lib/schedules/schedule-templates";

const CRON_PRESETS: Array<{ label: string; cron: string }> = [
  { label: "Daily at 6 AM", cron: "0 6 * * *" },
  { label: "Daily at 7 AM", cron: "0 7 * * *" },
  { label: "Weekdays at 9 AM", cron: "0 9 * * 1-5" },
  { label: "Weekly Friday at 5 PM", cron: "0 17 * * 5" },
];

interface CustomScheduleFormProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  agentId: string;
  channelId: string | null;
  onCreated: () => void;
}

export function CustomScheduleForm({
  open,
  onClose,
  tenantId,
  agentId,
  channelId,
  onCreated,
}: CustomScheduleFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cronExpression, setCronExpression] = useState("0 6 * * *");
  const [useCustomCron, setUseCustomCron] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setDisplayName("");
    setPrompt("");
    setCronExpression("0 6 * * *");
    setUseCustomCron(false);
    setError(null);
  };

  const applyTemplate = (template: ScheduleTemplate) => {
    setDisplayName(template.display_name);
    setPrompt(template.prompt);
    setCronExpression(template.cron_expression);
    setUseCustomCron(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !prompt.trim() || !cronExpression.trim()) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          channel_id: channelId,
          display_name: displayName.trim(),
          prompt: prompt.trim(),
          cron_expression: cronExpression.trim(),
          enabled: true,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error?.message || payload?.error || "Failed to create schedule");
      }

      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add Custom Schedule" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Templates */}
        <div>
          <label className="block text-xs text-text-dim mb-1.5">
            Use a template
          </label>
          <div className="flex flex-wrap gap-2">
            {SCHEDULE_TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => applyTemplate(t)}
                className="inline-flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 text-text-secondary px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                <Clock className="w-3 h-3" />
                {t.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm text-text-secondary mb-1">Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Morning Field Check"
            maxLength={100}
            className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-2.5 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm"
          />
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Instructions
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="What should the assistant do when this schedule runs?"
            maxLength={2000}
            className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-2.5 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm resize-y"
          />
        </div>

        {/* Schedule */}
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">
            Schedule
          </label>
          {!useCustomCron ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.cron}
                    type="button"
                    onClick={() => setCronExpression(preset.cron)}
                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
                      cronExpression === preset.cron
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-text-secondary hover:border-accent/50"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomCron(true)}
                  className="text-xs px-3 py-1.5 rounded-md border border-border text-text-dim hover:border-accent/50 transition-colors cursor-pointer"
                >
                  Custom...
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <input
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 6 * * *"
                className="w-full border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-2.5 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm font-mono"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-dim">
                  Format: minute hour day-of-month month day-of-week
                </p>
                <button
                  type="button"
                  onClick={() => setUseCustomCron(false)}
                  className="text-xs text-text-dim hover:text-text-secondary cursor-pointer"
                >
                  Use presets
                </button>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { resetForm(); onClose(); }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Schedule
          </button>
        </div>
      </form>
    </Dialog>
  );
}
