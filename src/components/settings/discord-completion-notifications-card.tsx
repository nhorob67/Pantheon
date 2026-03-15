"use client";

import { useMemo, useState } from "react";
import { BellRing, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

interface DiscordCompletionNotificationsCardProps {
  tenantId: string;
  teamName: string;
  timezone: string;
  initialEnabled: boolean;
  context: "alerts" | "channels";
}

const COPY = {
  alerts: {
    title: "Discord Task Completion Updates",
    description:
      "Post a follow-up in Discord when an agent finishes or fails a task.",
    note:
      "Applies to Discord runtime tasks. Scheduled cron runs stay quiet unless a run explicitly overrides this setting.",
    icon: BellRing,
  },
  channels: {
    title: "Discord Completion Replies",
    description:
      "Send a Discord status reply after agent work completes or fails.",
    note:
      "This controls explicit lifecycle replies in Discord. Agents may still send their normal task response separately.",
    icon: MessageSquareText,
  },
} as const;

export function DiscordCompletionNotificationsCard({
  tenantId,
  teamName,
  timezone,
  initialEnabled,
  context,
}: DiscordCompletionNotificationsCardProps) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [baselineEnabled, setBaselineEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const content = COPY[context];
  const Icon = content.icon;

  const dirty = enabled !== baselineEnabled;
  const statusLabel = useMemo(
    () => (enabled ? "Enabled by default" : "Disabled by default"),
    [enabled]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_name: teamName,
          timezone,
          discord_completion_notifications_enabled: enabled,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Failed to save Discord notification setting");
      }

      setBaselineEnabled(enabled);
      toast("Discord completion notification setting saved", "success");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Failed to save Discord notification setting",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-headline text-base font-semibold text-foreground">
            {content.title}
          </h3>
          <p className="mt-1 text-sm text-foreground/60">
            {content.description}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-background/60 px-4 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Proactive task completion updates
          </p>
          <p className="mt-1 text-xs text-foreground/55">
            {content.note}
          </p>
          <p className="mt-2 text-xs font-medium text-foreground/45">
            {statusLabel}
          </p>
        </div>
        <Switch checked={enabled} onChange={setEnabled} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-xs text-foreground/45">
          This is a team-wide default. Individual runs can still override it.
        </p>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-energy">Unsaved changes</span>}
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            loading={saving}
            size="sm"
          >
            Save Setting
          </Button>
        </div>
      </div>
    </div>
  );
}
