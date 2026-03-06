"use client";

import { useMemo, useState } from "react";
import { Brain, SlidersHorizontal, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import type { MemoryCaptureLevel, MemoryMode } from "@/types/memory";

interface MemorySettingsInput {
  tenant_id: string;
  customer_id: string;
  mode: MemoryMode;
  capture_level: MemoryCaptureLevel;
  retention_days: number;
  exclude_categories: string[];
  auto_checkpoint: boolean;
  auto_compress: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface MemorySettingsPanelProps {
  tenantId: string;
  initialSettings: MemorySettingsInput;
}

const MODE_OPTIONS: { value: MemoryMode; label: string; description: string }[] = [
  {
    value: "hybrid_local_vault",
    label: "Conversation + saved memories",
    description:
      "Your assistant remembers conversations and saves important details \u2014 like crop plans, elevator preferences, and commitments \u2014 for future reference.",
  },
  {
    value: "native_only",
    label: "Conversation only",
    description:
      "Your assistant remembers things during each conversation but doesn\u2019t save notes for next time.",
  },
];

const CAPTURE_LEVEL_OPTIONS: {
  value: MemoryCaptureLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "conservative",
    label: "Minimal",
    description: "Only saves facts you explicitly share, like contracts or delivery dates.",
  },
  {
    value: "standard",
    label: "Balanced",
    description:
      "Saves things that come up naturally \u2014 field plans, preferences, and recurring topics. Good for most farms.",
  },
  {
    value: "aggressive",
    label: "Thorough",
    description:
      "Saves as much as possible, including passing mentions and observations. Useful if you want detailed history.",
  },
];

const RETENTION_PRESETS = [
  { label: "90 days", value: 90 },
  { label: "1 year", value: 365 },
  { label: "3 years", value: 1095 },
  { label: "10 years", value: 3650 },
] as const;

export function MemorySettingsPanel({
  tenantId,
  initialSettings,
}: MemorySettingsPanelProps) {
  const [settings, setSettings] = useState<MemorySettingsInput>(initialSettings);
  const [excludeInput, setExcludeInput] = useState(
    initialSettings.exclude_categories.join(", ")
  );
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState<
    "checkpoint" | "compress" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const updatedLabel = useMemo(() => {
    if (!settings.updated_at) {
      return "Not saved yet";
    }

    const dt = new Date(settings.updated_at);
    if (Number.isNaN(dt.getTime())) {
      return "Unknown";
    }

    return dt.toLocaleString();
  }, [settings.updated_at]);

  const isDirty = useMemo(() => {
    return (
      settings.mode !== initialSettings.mode ||
      settings.capture_level !== initialSettings.capture_level ||
      settings.retention_days !== initialSettings.retention_days ||
      settings.auto_checkpoint !== initialSettings.auto_checkpoint ||
      settings.auto_compress !== initialSettings.auto_compress ||
      excludeInput !== initialSettings.exclude_categories.join(", ")
    );
  }, [settings, excludeInput, initialSettings]);

  const isNativeOnly = settings.mode === "native_only";

  const normalizeExcludeInput = (value: string): string[] => {
    const parts = value
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0)
      .map((part) => part.replace(/\s+/g, "-"));

    return Array.from(new Set(parts));
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);

    const nextExclude = normalizeExcludeInput(excludeInput);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/memory/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: settings.mode,
          capture_level: settings.capture_level,
          retention_days: settings.retention_days,
          exclude_categories: nextExclude,
          auto_checkpoint: settings.auto_checkpoint,
          auto_compress: settings.auto_compress,
        }),
      });

      const payload = (await res.json()) as {
        data?: {
          settings?: MemorySettingsInput;
          rebuild?: { attempted: boolean; succeeded: boolean };
        };
        settings?: MemorySettingsInput;
        rebuild?: { attempted: boolean; succeeded: boolean };
        error?: { message?: string } | string;
      };

      const settings_ = payload?.data?.settings ?? payload?.settings;
      const rebuild_ = payload?.data?.rebuild ?? payload?.rebuild;
      const errorMsg =
        typeof payload?.error === "object"
          ? payload.error?.message
          : payload?.error;

      if (!res.ok || !settings_) {
        throw new Error(errorMsg || "Failed to save memory settings");
      }

      setSettings(settings_);
      setExcludeInput(settings_.exclude_categories.join(", "));

      if (rebuild_?.attempted && !rebuild_.succeeded) {
        setNotice("Settings saved, but the update didn\u2019t fully apply. Try again in a few minutes.");
      } else {
        setNotice("Memory settings saved.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save memory settings");
    } finally {
      setSaving(false);
    }
  };

  const runOperation = async (operation: "checkpoint" | "compress") => {
    setRunningAction(operation);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/tenants/${tenantId}/memory/${operation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: `manual ${operation} from dashboard`,
        }),
      });

      const payload = (await res.json()) as {
        data?: { operation?: { id: string; status: string } };
        operation?: { id: string; status: string };
        error?: { message?: string } | string;
      };

      const operation_ = payload?.data?.operation ?? payload?.operation;
      const errorMsg =
        typeof payload?.error === "object"
          ? payload.error?.message
          : payload?.error;

      if (!res.ok || !operation_) {
        throw new Error(errorMsg || `Failed to queue ${operation}`);
      }

      setNotice(
        operation === "checkpoint"
          ? "Backup started \u2014 this may take a few minutes."
          : "Cleanup started \u2014 this may take a few minutes."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start backup/cleanup. Please try again."
      );
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-6">
      {/* Mode selection */}
      <div className="space-y-1">
        <h4 className="font-headline text-base font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" aria-hidden="true" />
          How your assistant remembers
          <Tooltip text="This controls whether your assistant keeps notes between conversations. Most farms benefit from saved memories." />
        </h4>
        <p className="text-sm text-foreground/60">
          Choose whether your assistant only remembers the current conversation or builds up notes over time.
        </p>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Memory mode">
        {MODE_OPTIONS.map((option) => {
          const active = settings.mode === option.value;
          const isRecommended = option.value === "hybrid_local_vault";
          const isConversationOnly = option.value === "native_only";

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() =>
                setSettings((current) => ({ ...current, mode: option.value }))
              }
              className={`w-full text-left rounded-lg border transition-colors cursor-pointer ${
                isConversationOnly ? "py-2.5 px-4" : "p-4"
              } ${
                active
                  ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5"
                  : "border-border hover:border-foreground/20 hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm flex items-center gap-1.5 ${
                  isConversationOnly
                    ? "font-medium text-foreground/70"
                    : "font-semibold text-foreground"
                }`}>
                  {isRecommended && <Brain className="w-4 h-4 text-primary" aria-hidden="true" />}
                  {option.label}
                </p>
                {isRecommended && <Badge variant="success">Recommended</Badge>}
              </div>
              <p className={`text-xs mt-0.5 ${
                isConversationOnly ? "text-foreground/40" : "text-foreground/50"
              }`}>
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Fine-tuning controls */}
      <div className={isNativeOnly ? "opacity-50 pointer-events-none" : ""}>
        {isNativeOnly && (
          <p className="text-xs text-foreground/50 mb-4 italic">
            These settings apply when saved memories are enabled.
          </p>
        )}

        {/* Capture Settings */}
        <div className="space-y-4">
          <h5 className="text-xs uppercase tracking-wider text-foreground/40 font-medium flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Capture Settings
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-foreground/60 mb-1.5">
                What gets saved
                <Tooltip text="Higher settings capture more detail from your conversations. Start with Balanced and adjust based on how much your assistant recalls." />
              </label>
              <div className="inline-flex rounded-lg border border-border overflow-hidden">
                {CAPTURE_LEVEL_OPTIONS.map((option) => {
                  const isActive = settings.capture_level === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setSettings((current) => ({
                          ...current,
                          capture_level: option.value,
                        }))
                      }
                      className={`px-4 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-transparent text-foreground/60 hover:bg-muted"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-foreground/40 mt-1">
                {
                  CAPTURE_LEVEL_OPTIONS.find(
                    (option) => option.value === settings.capture_level
                  )?.description
                }
              </p>
            </div>

            <div>
              <label className="block text-sm text-foreground/60 mb-1.5">
                Keep memories for (days)
                <Tooltip text="Memories older than this are automatically removed. Longer retention uses more storage but gives your assistant more history to draw on." />
              </label>
              <input
                type="number"
                min={7}
                max={3650}
                value={settings.retention_days}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    retention_days: Number(e.target.value) || 7,
                  }))
                }
                className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {RETENTION_PRESETS.map((preset) => {
                  const isActive = settings.retention_days === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        setSettings((current) => ({
                          ...current,
                          retention_days: preset.value,
                        }))
                      }
                      className={`rounded-full text-xs px-3 py-1 border transition-colors ${
                        isActive
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border text-foreground/50 hover:border-foreground/20 hover:bg-muted"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-foreground/60 mb-1.5">
              Topics to never remember
              <Tooltip text="Add topics here that you don't want your assistant to store — for example, personal financial details or account passwords." />
            </label>
            <input
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              placeholder="passwords, pin-codes, personal-finance"
              className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground text-sm"
            />
            <p className="text-xs text-foreground/40 mt-1">
              Comma-separated topics (lowercase and hyphens). Your assistant will skip saving anything tagged with these.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-5" />

        {/* Maintenance */}
        <div className="space-y-3">
          <h5 className="text-xs uppercase tracking-wider text-foreground/40 font-medium flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" aria-hidden="true" />
            Maintenance
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Automatic backups
                  <Tooltip text="Creates periodic snapshots so your assistant's memory can be restored if something goes wrong." />
                </p>
                <p className="text-xs text-foreground/50">Periodically save a snapshot of your assistant&apos;s memory so it can be restored if needed.</p>
              </div>
              <Switch
                checked={settings.auto_checkpoint}
                onChange={(checked) =>
                  setSettings((current) => ({ ...current, auto_checkpoint: checked }))
                }
              />
            </div>

            <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Automatic cleanup
                  <Tooltip text="Merges and summarizes older memories so your assistant stays fast without losing important context." />
                </p>
                <p className="text-xs text-foreground/50">Periodically summarize older memories to keep things tidy and reduce storage use.</p>
              </div>
              <Switch
                checked={settings.auto_compress}
                onChange={(checked) =>
                  setSettings((current) => ({ ...current, auto_compress: checked }))
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            onClick={saveSettings}
            loading={saving}
            className={isDirty ? "ring-2 ring-energy/40" : ""}
          >
            Save Settings
          </Button>
          {isDirty && (
            <span className="text-xs text-energy">Unsaved changes</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => runOperation("checkpoint")}
            loading={runningAction === "checkpoint"}
          >
            Back Up Now
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => runOperation("compress")}
            loading={runningAction === "compress"}
          >
            Clean Up Now
          </Button>
        </div>
      </div>

      <div className="text-xs text-foreground/50">
        Last updated: <span className="font-mono">{updatedLabel}</span>
      </div>

      {notice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
