"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { MemoryCaptureLevel, MemoryMode } from "@/types/memory";

interface MemorySettingsInput {
  instance_id: string;
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
    value: "native_only",
    label: "Native only",
    description: "Use OpenClaw native memory only.",
  },
  {
    value: "hybrid_local_vault",
    label: "Hybrid local vault",
    description: "Use native memory plus local vault retention workflows.",
  },
];

const CAPTURE_LEVEL_OPTIONS: {
  value: MemoryCaptureLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "conservative",
    label: "Conservative",
    description: "Capture fewer items to reduce memory growth.",
  },
  {
    value: "standard",
    label: "Standard",
    description: "Balanced default for most farms.",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Capture more details for long-horizon recall.",
  },
];

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
        setNotice("Settings saved, but instance rebuild did not complete.");
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

      setNotice(`${operation === "checkpoint" ? "Checkpoint" : "Compress"} queued.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to queue ${operation}`);
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-6">
      <div className="space-y-1">
        <h4 className="font-headline text-base font-semibold text-foreground">
          Memory Mode
        </h4>
        <p className="text-sm text-foreground/60">
          Choose how context is retained for future responses.
        </p>
      </div>

      <div className="space-y-2">
        {MODE_OPTIONS.map((option) => {
          const active = settings.mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setSettings((current) => ({ ...current, mode: option.value }))
              }
              className={`w-full text-left rounded-lg border p-4 transition-colors cursor-pointer ${
                active
                  ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5"
                  : "border-border hover:border-foreground/20 hover:bg-muted"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{option.label}</p>
              <p className="text-xs text-foreground/50 mt-0.5">{option.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-foreground/60 mb-1.5">
            Capture level
          </label>
          <select
            value={settings.capture_level}
            onChange={(e) =>
              setSettings((current) => ({
                ...current,
                capture_level: e.target.value as MemoryCaptureLevel,
              }))
            }
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground text-sm"
          >
            {CAPTURE_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
            Retention (days)
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
          <p className="text-xs text-foreground/40 mt-1">Allowed range: 7-3650</p>
        </div>
      </div>

      <div>
        <label className="block text-sm text-foreground/60 mb-1.5">
          Excluded categories
        </label>
        <input
          value={excludeInput}
          onChange={(e) => setExcludeInput(e.target.value)}
          placeholder="secrets, otp, ephemeral"
          className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground text-sm"
        />
        <p className="text-xs text-foreground/40 mt-1">
          Comma-separated category keys (lowercase + hyphens).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Auto checkpoint</p>
            <p className="text-xs text-foreground/50">Allow periodic checkpoint jobs.</p>
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
            <p className="text-sm font-medium text-foreground">Auto compress</p>
            <p className="text-xs text-foreground/50">Allow periodic compression jobs.</p>
          </div>
          <Switch
            checked={settings.auto_compress}
            onChange={(checked) =>
              setSettings((current) => ({ ...current, auto_compress: checked }))
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" onClick={saveSettings} loading={saving}>
          Save Settings
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => runOperation("checkpoint")}
          loading={runningAction === "checkpoint"}
        >
          Run Checkpoint
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => runOperation("compress")}
          loading={runningAction === "compress"}
        >
          Run Compress
        </Button>
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
