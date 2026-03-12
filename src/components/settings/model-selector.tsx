"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, Eye, Wrench, Cpu } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface CatalogModel {
  id: string;
  provider: string;
  display_name: string;
  description: string | null;
  context_window: number | null;
  max_output_tokens: number | null;
  supports_vision: boolean;
  supports_tools: boolean;
  input_cost_per_million: number;
  output_cost_per_million: number;
  tier_hint: string;
}

interface Props {
  tenantId: string;
}

export function ModelSelector({ tenantId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<CatalogModel[]>([]);
  const [primaryModelId, setPrimaryModelId] = useState<string | null>(null);
  const [fastModelId, setFastModelId] = useState<string | null>(null);
  const [initialPrimary, setInitialPrimary] = useState<string | null>(null);
  const [initialFast, setInitialFast] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/tenants/${tenantId}/model-preferences`)
      .then((r) => r.json())
      .then((data) => {
        setCatalog(data.catalog || []);
        const pref = data.preferences;
        setPrimaryModelId(pref?.primary_model_id || null);
        setFastModelId(pref?.fast_model_id || null);
        setInitialPrimary(pref?.primary_model_id || null);
        setInitialFast(pref?.fast_model_id || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tenantId]);

  const hasChanges =
    primaryModelId !== initialPrimary || fastModelId !== initialFast;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/model-preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_model_id: primaryModelId,
          fast_model_id: fastModelId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      setInitialPrimary(primaryModelId);
      setInitialFast(fastModelId);
      toast("Model preferences saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
      </div>
    );
  }

  const primaryModels = catalog.filter(
    (m) => m.tier_hint === "primary" || m.tier_hint === "both"
  );
  const fastModels = catalog.filter(
    (m) => m.tier_hint === "fast" || m.tier_hint === "both"
  );

  return (
    <div className="space-y-8">
      <ModelTierSection
        title="Primary Model"
        description="Used for conversations, tool use, and complex reasoning."
        models={primaryModels}
        selectedId={primaryModelId}
        onSelect={setPrimaryModelId}
      />
      <ModelTierSection
        title="Fast Model"
        description="Used for summarization, query expansion, pattern extraction, and reranking."
        models={fastModels}
        selectedId={fastModelId}
        onSelect={setFastModelId}
      />
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

function ModelTierSection({
  title,
  description,
  models,
  selectedId,
  onSelect,
}: {
  title: string;
  description: string;
  models: CatalogModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h4 className="font-headline text-base mb-1">{title}</h4>
      <p className="text-foreground/50 text-xs mb-3">{description}</p>
      <div className="space-y-2">
        {models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            selected={selectedId === model.id}
            onSelect={() => onSelect(model.id)}
          />
        ))}
        {models.length === 0 && (
          <p className="text-foreground/40 text-sm py-4 text-center">
            No approved models available for this tier.
          </p>
        )}
      </div>
    </div>
  );
}

function ModelCard({
  model,
  selected,
  onSelect,
}: {
  model: CatalogModel;
  selected: boolean;
  onSelect: () => void;
}) {
  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatContext = (tokens: number | null) => {
    if (!tokens) return null;
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    return `${Math.round(tokens / 1000)}K`;
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border p-4 transition-all ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border hover:border-foreground/20 bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{model.display_name}</span>
            <span
              className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                model.provider === "anthropic"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-blue-500/10 text-blue-500"
              }`}
            >
              {model.provider}
            </span>
          </div>
          {model.description && (
            <p className="text-foreground/50 text-xs mb-2 line-clamp-1">
              {model.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-foreground/40">
            {model.context_window && (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {formatContext(model.context_window)} ctx
              </span>
            )}
            {model.supports_vision && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> Vision
              </span>
            )}
            {model.supports_tools && (
              <span className="flex items-center gap-1">
                <Wrench className="w-3 h-3" /> Tools
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-foreground/50">
            <span className="font-mono">{formatCost(model.input_cost_per_million)}</span>
            <span className="text-foreground/30"> / 1M in</span>
          </div>
          <div className="text-xs text-foreground/50">
            <span className="font-mono">{formatCost(model.output_cost_per_million)}</span>
            <span className="text-foreground/30"> / 1M out</span>
          </div>
        </div>
        <div className="shrink-0 mt-1">
          {selected ? (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-foreground/20" />
          )}
        </div>
      </div>
    </button>
  );
}
