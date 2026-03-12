"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";

interface Projection {
  model_id: string;
  display_name: string;
  provider: string;
  projected_cost_cents: number;
  savings_cents: number;
  savings_percent: number;
}

interface CostData {
  has_usage: boolean;
  message?: string;
  current_cost_cents?: number;
  projections?: Projection[];
}

interface Props {
  tenantId: string;
}

export function ModelCostTips({ tenantId }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CostData | null>(null);

  useEffect(() => {
    fetch(`/api/tenants/${tenantId}/model-cost-tips`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tenantId]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
        </div>
      </div>
    );
  }

  if (!data?.has_usage) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-headline text-base mb-1">Cost Comparison</h3>
        <p className="text-foreground/50 text-sm">
          {data?.message || "Not enough usage data yet for cost estimates."}
        </p>
      </div>
    );
  }

  const currentDollars = ((data.current_cost_cents || 0) / 100).toFixed(2);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-headline text-base mb-1">Cost Comparison</h3>
      <p className="text-foreground/50 text-xs mb-4">
        Based on your past 30 days of usage — current spend:{" "}
        <span className="font-mono font-medium text-foreground/70">${currentDollars}</span>
      </p>

      <div className="space-y-2">
        {(data.projections || []).map((proj) => {
          const projDollars = (proj.projected_cost_cents / 100).toFixed(2);
          const isGreen = proj.savings_percent > 5;
          const isRed = proj.savings_percent < -5;

          return (
            <div
              key={proj.model_id}
              className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-4 py-3"
            >
              <div>
                <span className="text-sm font-medium">{proj.display_name}</span>
                <span
                  className={`ml-2 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    proj.provider === "anthropic"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-blue-500/10 text-blue-500"
                  }`}
                >
                  {proj.provider}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">${projDollars}/mo</span>
                <span
                  className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    isGreen
                      ? "bg-green-500/10 text-green-400"
                      : isRed
                        ? "bg-destructive/10 text-destructive"
                        : "bg-foreground/5 text-foreground/50"
                  }`}
                >
                  {isGreen ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : isRed ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  {Math.abs(proj.savings_percent)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
