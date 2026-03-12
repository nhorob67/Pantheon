"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  KeyRound,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Shield,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { TenantSecret } from "@/lib/secrets/vault";
import { jsonFetcher } from "@/lib/utils/fetcher";

export interface AgentOption {
  id: string;
  display_name: string;
  agent_key: string;
}

const SCHEME_LABELS: Record<string, string> = {
  bearer: "Bearer Token",
  basic: "Basic Auth",
  header: "Custom Header",
  query_param: "Query Parameter",
};

interface Props {
  tenantId: string;
  agents: AgentOption[];
}

export function SecretsVaultPanel({ tenantId, agents }: Props) {
  const { data, isLoading: loading, mutate } = useSWR(
    `/api/tenants/${tenantId}/secrets`,
    jsonFetcher
  );
  const secrets: TenantSecret[] = data?.secrets ?? [];
  const revealStatusFromServer: string | null = data?.reveal_secret_status ?? null;

  const [showForm, setShowForm] = useState(false);
  const [togglingReveal, setTogglingReveal] = useState(false);
  const { toast } = useToast();

  const effectiveRevealStatus = revealStatusFromServer;

  const handleDelete = async (secretId: string, label: string) => {
    if (!confirm(`Delete secret "${label}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/secrets/${secretId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast(`Secret "${label}" deleted`);
      mutate();
    } catch {
      toast("Failed to delete secret", "error");
    }
  };

  const handleToggleReveal = async () => {
    const newEnabled = effectiveRevealStatus !== "enabled";
    if (newEnabled && !confirm(
      "Enable break-glass access? This allows agents to reveal raw secret values " +
      "when approved by the workspace owner. Are you sure?"
    )) return;

    setTogglingReveal(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/secrets/reveal-toggle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      const result = await res.json();
      mutate();
      toast(`Break-glass access ${result.status === "enabled" ? "enabled" : "disabled"}`);
    } catch {
      toast("Failed to toggle break-glass access", "error");
    } finally {
      setTogglingReveal(false);
    }
  };

  const handleSecretUpdated = () => {
    mutate();
  };

  return (
    <div className="space-y-4">
      {/* How it works */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-foreground/70 space-y-1">
            <p className="font-medium text-foreground/90">How credential injection works</p>
            <p>
              Your agents never see raw secrets. When an agent needs to call an external API,
              it requests a <strong>credential handle</strong> — an opaque reference. The server
              then injects the actual credential into the HTTP request headers server-side.
              Secrets are redacted from all traces, logs, and memory.
            </p>
          </div>
        </div>
      </div>

      {/* Secret list */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <h3 className="font-headline text-base">Stored Secrets</h3>
            <span className="text-xs text-foreground/50">({secrets.length})</span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Secret
          </Button>
        </div>

        {showForm && (
          <AddSecretForm
            tenantId={tenantId}
            agents={agents}
            onCreated={(secret) => {
              mutate();
              setShowForm(false);
              toast(`Secret "${secret.label}" created`);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div className="p-6">
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-foreground/5 animate-pulse" />
              ))}
            </div>
          </div>
        ) : secrets.length === 0 ? (
          <div className="p-8 text-center text-foreground/50 text-sm">
            <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No secrets stored yet.</p>
            <p className="mt-1">
              Add API keys or passwords that your agents can use for external API calls.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {secrets.map((secret) => (
              <SecretRow
                key={secret.id}
                secret={secret}
                agents={agents}
                tenantId={tenantId}
                onDelete={() => handleDelete(secret.id, secret.label)}
                onUpdated={handleSecretUpdated}
              />
            ))}
          </div>
        )}
      </div>

      {/* Break-glass access toggle */}
      {effectiveRevealStatus !== null && (
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-headline text-base">Break-glass access</h3>
                  <p className="text-sm text-foreground/60 mt-0.5">
                    When enabled, agents can request the raw value of secrets marked as &ldquo;Break glass&rdquo; mode.
                    Every reveal requires owner approval and is fully audited. Revealed values are redacted
                    from stored messages.
                  </p>
                </div>
              </div>
              <div className="ml-4">
                <Switch
                  checked={effectiveRevealStatus === "enabled"}
                  onChange={() => handleToggleReveal()}
                  disabled={togglingReveal}
                  checkedColorClass="bg-amber-500"
                />
              </div>
            </div>
            {effectiveRevealStatus === "enabled" && (
              <div className="mt-3 ml-8 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-400">
                  Break-glass access is active. The <code>reveal_secret</code> tool is available to agents,
                  gated behind owner approval. Only secrets with usage mode set to &ldquo;Break glass&rdquo; can be revealed.
                  Max 5 reveals per hour.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Secret Row (expandable for editing agent scoping + domains)
// ---------------------------------------------------------------------------

function SecretRow({
  secret,
  agents,
  tenantId,
  onDelete,
  onUpdated,
}: {
  secret: TenantSecret;
  agents: AgentOption[];
  tenantId: string;
  onDelete: () => void;
  onUpdated: () => void;
}) {
  const [showHint, setShowHint] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editAgentIds, setEditAgentIds] = useState<string[]>(secret.allowed_agent_ids ?? []);
  const [editDomains, setEditDomains] = useState((secret.allowed_domains ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const agentNames = secret.allowed_agent_ids && secret.allowed_agent_ids.length > 0
    ? secret.allowed_agent_ids
        .map((id) => agents.find((a) => a.id === id)?.display_name)
        .filter(Boolean)
        .join(", ")
    : null;

  const handleSaveScoping = async () => {
    setSaving(true);
    try {
      const domainList = editDomains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = {
        allowed_agent_ids: editAgentIds.length > 0 ? editAgentIds : null,
        allowed_domains: domainList.length > 0 ? domainList : null,
      };

      const res = await fetch(`/api/tenants/${tenantId}/secrets/${secret.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update");
      await res.json();
      onUpdated();
      setExpanded(false);
      toast("Secret scoping updated");
    } catch {
      toast("Failed to update secret", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleAgentId = (id: string) => {
    setEditAgentIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <div
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-foreground/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="shrink-0 text-foreground/30">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-sm font-semibold text-foreground">{secret.label}</code>
            <span className="text-xs px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/60">
              {SCHEME_LABELS[secret.inject_scheme] || secret.inject_scheme}
            </span>
          </div>
          {secret.description && (
            <p className="text-xs text-foreground/50 mt-0.5">{secret.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-foreground/40">
            <span className="flex items-center gap-1">
              {showHint ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  <code>{secret.value_hint}</code>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Click to show hint</span>
                </>
              )}
            </span>
            {secret.allowed_domains && secret.allowed_domains.length > 0 && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {secret.allowed_domains.join(", ")}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {agentNames || "All agents"}
            </span>
            {secret.use_count > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Used {secret.use_count}x
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowHint(!showHint)}
            className="p-2 rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-muted transition-colors"
            title={showHint ? "Hide hint" : "Show hint"}
          >
            {showHint ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete secret"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pl-12 space-y-3 bg-foreground/[0.02]">
          {/* Agent scoping */}
          {agents.length > 0 && (
            <div>
              <label className="block text-sm text-foreground/70 mb-1.5">
                Allowed Agents
              </label>
              <div className="space-y-1.5">
                {agents.map((agent) => (
                  <Checkbox
                    key={agent.id}
                    label={`${agent.display_name} (${agent.agent_key})`}
                    checked={editAgentIds.includes(agent.id)}
                    onChange={() => toggleAgentId(agent.id)}
                  />
                ))}
              </div>
              <p className="text-xs text-foreground/40 mt-1">
                Leave unchecked to allow all agents.
              </p>
            </div>
          )}

          {/* Domain scoping */}
          <div>
            <label className="block text-sm text-foreground/70 mb-1">
              Allowed Domains (comma-separated)
            </label>
            <input
              className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-2.5 outline-none transition-colors text-sm"
              value={editDomains}
              onChange={(e) => setEditDomains(e.target.value)}
              placeholder="api.example.com, data.example.com"
            />
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveScoping}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Secret Form
// ---------------------------------------------------------------------------

function AddSecretForm({
  tenantId,
  agents,
  onCreated,
  onCancel,
}: {
  tenantId: string;
  agents: AgentOption[];
  onCreated: (secret: TenantSecret) => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [scheme, setScheme] = useState<string>("bearer");
  const [headerName, setHeaderName] = useState("");
  const [paramName, setParamName] = useState("");
  const [domains, setDomains] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleAgentId = (id: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        label: label.trim(),
        value: value,
        inject_scheme: scheme,
      };

      if (description.trim()) body.description = description.trim();
      if (scheme === "header" && headerName.trim()) body.inject_header_name = headerName.trim();
      if (scheme === "query_param" && paramName.trim()) body.inject_param_name = paramName.trim();

      const domainList = domains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      if (domainList.length > 0) body.allowed_domains = domainList;
      if (selectedAgentIds.length > 0) body.allowed_agent_ids = selectedAgentIds;

      const res = await fetch(`/api/tenants/${tenantId}/secrets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create secret");
      }

      const data = await res.json();
      onCreated(data.secret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create secret";
      setError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-input px-4 py-2.5 outline-none transition-colors text-sm";

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b border-border bg-foreground/[0.02]">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-foreground/70 mb-1">Label</label>
            <input
              className={inputClass}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="my-api-key"
              pattern="^[a-zA-Z0-9_-]+$"
              required
            />
            <p className="text-xs text-foreground/40 mt-0.5">
              Letters, numbers, hyphens, underscores only
            </p>
          </div>
          <div>
            <label className="block text-sm text-foreground/70 mb-1">Description (optional)</label>
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Climate FieldView API key"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-foreground/70 mb-1">Secret Value</label>
          <input
            type="password"
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-..."
            required
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-foreground/70 mb-1">Injection Scheme</label>
            <select
              className={inputClass}
              value={scheme}
              onChange={(e) => setScheme(e.target.value)}
            >
              <option value="bearer">Bearer Token (Authorization: Bearer ...)</option>
              <option value="basic">Basic Auth (Authorization: Basic ...)</option>
              <option value="header">Custom Header</option>
              <option value="query_param">Query Parameter</option>
            </select>
          </div>

          {scheme === "header" && (
            <div>
              <label className="block text-sm text-foreground/70 mb-1">Header Name</label>
              <input
                className={inputClass}
                value={headerName}
                onChange={(e) => setHeaderName(e.target.value)}
                placeholder="X-API-Key"
              />
            </div>
          )}

          {scheme === "query_param" && (
            <div>
              <label className="block text-sm text-foreground/70 mb-1">Parameter Name</label>
              <input
                className={inputClass}
                value={paramName}
                onChange={(e) => setParamName(e.target.value)}
                placeholder="api_key"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-foreground/70 mb-1">
            Allowed Domains (optional, comma-separated)
          </label>
          <input
            className={inputClass}
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="api.example.com, data.example.com"
          />
          <p className="text-xs text-foreground/40 mt-0.5">
            Restrict which domains this credential can be sent to. Leave empty to allow any domain.
          </p>
        </div>

        {/* Agent scoping */}
        {agents.length > 0 && (
          <div>
            <label className="block text-sm text-foreground/70 mb-1.5">
              Allowed Agents (optional)
            </label>
            <div className="space-y-1.5">
              {agents.map((agent) => (
                <Checkbox
                  key={agent.id}
                  label={`${agent.display_name} (${agent.agent_key})`}
                  checked={selectedAgentIds.includes(agent.id)}
                  onChange={() => toggleAgentId(agent.id)}
                />
              ))}
            </div>
            <p className="text-xs text-foreground/40 mt-1">
              Leave unchecked to allow all agents.
            </p>
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}

        <div className="flex items-center gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving || !label.trim() || !value}>
            {saving ? "Saving..." : "Save Secret"}
          </Button>
        </div>
      </div>
    </form>
  );
}
