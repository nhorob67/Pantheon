"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Check, X, Eye, Wrench } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface CatalogModel {
  id: string;
  provider: string;
  display_name: string;
  description: string | null;
  context_window: number | null;
  supports_vision: boolean;
  supports_tools: boolean;
  input_cost_per_million: number;
  output_cost_per_million: number;
  tier_hint: string;
  is_approved: boolean;
  tenant_count: number;
  last_synced_at: string;
}

export function ModelCatalogTable() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/models");
      const data = await res.json();
      setModels(data.models || []);
    } catch {
      toast("Failed to load models", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/models/sync", { method: "POST" });
      const data = await res.json();
      const added =
        (data.anthropic?.models_added || 0) + (data.openrouter?.models_added || 0);
      const updated =
        (data.anthropic?.models_updated || 0) + (data.openrouter?.models_updated || 0);
      toast(`Sync complete: ${added} added, ${updated} updated`, "success");
      await fetchModels();
    } catch {
      toast("Sync failed", "error");
    } finally {
      setSyncing(false);
    }
  };

  const toggleApproval = async (model: CatalogModel) => {
    setTogglingId(model.id);
    const action = model.is_approved ? "revoke" : "approve";
    try {
      const res = await fetch(
        `/api/admin/models/${encodeURIComponent(model.id)}/${action}`,
        { method: "PUT" }
      );
      if (!res.ok) throw new Error();
      setModels((prev) =>
        prev.map((m) =>
          m.id === model.id ? { ...m, is_approved: !m.is_approved } : m
        )
      );
      toast(`${model.display_name} ${action}d`, "success");
    } catch {
      toast(`Failed to ${action} model`, "error");
    } finally {
      setTogglingId(null);
    }
  };

  const updateTierHint = async (modelId: string, tierHint: string) => {
    try {
      const res = await fetch(
        `/api/admin/models/${encodeURIComponent(modelId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier_hint: tierHint }),
        }
      );
      if (!res.ok) throw new Error();
      setModels((prev) =>
        prev.map((m) => (m.id === modelId ? { ...m, tier_hint: tierHint } : m))
      );
    } catch {
      toast("Failed to update tier", "error");
    }
  };

  const formatCost = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-muted border border-border rounded-lg hover:bg-muted/80 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-foreground/60">
                  Model
                </th>
                <th className="text-left px-4 py-3 font-medium text-foreground/60">
                  Provider
                </th>
                <th className="text-left px-4 py-3 font-medium text-foreground/60">
                  Pricing (per 1M)
                </th>
                <th className="text-center px-4 py-3 font-medium text-foreground/60">
                  Capabilities
                </th>
                <th className="text-center px-4 py-3 font-medium text-foreground/60">
                  Tier
                </th>
                <th className="text-center px-4 py-3 font-medium text-foreground/60">
                  Tenants
                </th>
                <th className="text-center px-4 py-3 font-medium text-foreground/60">
                  Approved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {models.map((model) => (
                <tr key={model.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{model.display_name}</div>
                    <div className="text-xs text-foreground/40 font-mono truncate max-w-[240px]">
                      {model.id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        model.provider === "anthropic"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {model.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <div>{formatCost(model.input_cost_per_million)} in</div>
                    <div>{formatCost(model.output_cost_per_million)} out</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-foreground/40">
                      {model.supports_vision && (
                        <span title="Vision"><Eye className="w-3.5 h-3.5" /></span>
                      )}
                      {model.supports_tools && (
                        <span title="Tools"><Wrench className="w-3.5 h-3.5" /></span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={model.tier_hint}
                      onChange={(e) => updateTierHint(model.id, e.target.value)}
                      className="bg-muted border border-border rounded px-2 py-1 text-xs"
                    >
                      <option value="both">Both</option>
                      <option value="primary">Primary</option>
                      <option value="fast">Fast</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs">
                    {model.tenant_count}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleApproval(model)}
                      disabled={togglingId === model.id}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                        model.is_approved
                          ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          : "bg-foreground/5 text-foreground/30 hover:bg-foreground/10"
                      }`}
                      title={model.is_approved ? "Revoke" : "Approve"}
                    >
                      {togglingId === model.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : model.is_approved ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {models.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground/40">
                    No models in catalog. Click &ldquo;Sync Now&rdquo; to fetch from providers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
