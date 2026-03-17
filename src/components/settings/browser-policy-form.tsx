"use client";

import { useState } from "react";
import { Plus, X, Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface BrowserPolicyData {
  domain_allowlist: string[];
  domain_blocklist: string[];
  require_approval_actions: string[];
  max_sessions_per_day: number;
  max_actions_per_session: number;
  max_session_duration_ms: number;
  base_cost_cents: number;
  per_action_cost_cents: number;
}

interface Props {
  tenantId: string;
  initialPolicy: BrowserPolicyData;
}

export function BrowserPolicyForm({ tenantId, initialPolicy }: Props) {
  const [allowlist, setAllowlist] = useState<string[]>(initialPolicy.domain_allowlist);
  const [blocklist, setBlocklist] = useState<string[]>(initialPolicy.domain_blocklist);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState(initialPolicy.max_sessions_per_day);
  const [maxActionsPerSession, setMaxActionsPerSession] = useState(initialPolicy.max_actions_per_session);
  const [maxSessionDurationMs, setMaxSessionDurationMs] = useState(initialPolicy.max_session_duration_ms);
  const [baseCostCents, setBaseCostCents] = useState(initialPolicy.base_cost_cents);
  const [perActionCostCents, setPerActionCostCents] = useState(initialPolicy.per_action_cost_cents);
  const [requireApprovalActions, setRequireApprovalActions] = useState<string[]>(
    initialPolicy.require_approval_actions
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/browser-policy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain_allowlist: allowlist.filter(Boolean),
          domain_blocklist: blocklist.filter(Boolean),
          require_approval_actions: requireApprovalActions,
          max_sessions_per_day: maxSessionsPerDay,
          max_actions_per_session: maxActionsPerSession,
          max_session_duration_ms: maxSessionDurationMs,
          base_cost_cents: baseCostCents,
          per_action_cost_cents: perActionCostCents,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast("Browser policy saved");
    } catch {
      toast("Failed to save browser policy", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground placeholder:text-foreground/30 text-sm";
  const labelClass = "block text-sm text-foreground/60 mb-1.5";

  return (
    <div className="space-y-6">
      {/* Domain Allowlist */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-headline text-sm font-semibold text-foreground">
              Domain Allowlist
            </h4>
            <p className="text-xs text-foreground/40 mt-0.5">
              When set, agents can only navigate to these domains. Leave empty to allow all.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAllowlist([...allowlist, ""])}
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
        {allowlist.length === 0 && (
          <p className="text-xs text-foreground/30">No domains restricted (all allowed).</p>
        )}
        <div className="space-y-2">
          {allowlist.map((domain, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={domain}
                onChange={(e) => {
                  const next = [...allowlist];
                  next[i] = e.target.value;
                  setAllowlist(next);
                }}
                placeholder="e.g., example.com"
                className={`${inputClass} font-mono flex-1`}
              />
              <button
                type="button"
                onClick={() => setAllowlist(allowlist.filter((_, j) => j !== i))}
                className="p-2 text-foreground/40 hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Domain Blocklist */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-headline text-sm font-semibold text-foreground">
              Domain Blocklist
            </h4>
            <p className="text-xs text-foreground/40 mt-0.5">
              Agents will never navigate to these domains.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBlocklist([...blocklist, ""])}
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
        {blocklist.length === 0 && (
          <p className="text-xs text-foreground/30">No domains blocked.</p>
        )}
        <div className="space-y-2">
          {blocklist.map((domain, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={domain}
                onChange={(e) => {
                  const next = [...blocklist];
                  next[i] = e.target.value;
                  setBlocklist(next);
                }}
                placeholder="e.g., restricted-site.com"
                className={`${inputClass} font-mono flex-1`}
              />
              <button
                type="button"
                onClick={() => setBlocklist(blocklist.filter((_, j) => j !== i))}
                className="p-2 text-foreground/40 hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Session Limits */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h4 className="font-headline text-sm font-semibold text-foreground mb-4">
          Session Limits
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Max Sessions / Day</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxSessionsPerDay}
              onChange={(e) => setMaxSessionsPerDay(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Max Actions / Session</label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxActionsPerSession}
              onChange={(e) => setMaxActionsPerSession(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Max Duration (seconds)</label>
            <input
              type="number"
              min={10}
              max={300}
              value={Math.round(maxSessionDurationMs / 1000)}
              onChange={(e) => setMaxSessionDurationMs(Number(e.target.value) * 1000)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Cost Configuration */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h4 className="font-headline text-sm font-semibold text-foreground mb-4">
          Cost Configuration
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Base Cost per Session (cents)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={baseCostCents}
              onChange={(e) => setBaseCostCents(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cost per Action (cents)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={perActionCostCents}
              onChange={(e) => setPerActionCostCents(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Approval Actions */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="mb-3">
          <h4 className="font-headline text-sm font-semibold text-foreground">
            Approval Required Actions
          </h4>
          <p className="text-xs text-foreground/40 mt-0.5">
            When checked, the agent must have approval before performing these actions.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(["click", "fill", "navigate", "extract", "screenshot"] as const).map((action) => (
            <label key={action} className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
              <input
                type="checkbox"
                checked={requireApprovalActions.includes(action)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setRequireApprovalActions([...requireApprovalActions, action]);
                  } else {
                    setRequireApprovalActions(requireApprovalActions.filter((a) => a !== action));
                  }
                }}
                className="rounded border-border accent-primary"
              />
              <span className="capitalize">{action}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Policy
        </button>
      </div>
    </div>
  );
}
