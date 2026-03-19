"use client";

import React from "react";
import type { IntegrationSummary } from "@/types/integration";
import { useToast } from "@/components/ui/toast";
import { useIntegrations } from "@/hooks/use-integrations";
import { IntegrationCard } from "./integration-card";
import { Plug, RefreshCw } from "lucide-react";

interface Props {
  tenantId: string;
  initialIntegrations: IntegrationSummary[];
}

export function IntegrationListPanel({ tenantId, initialIntegrations }: Props) {
  const { toast } = useToast();
  const {
    integrations,
    loading,
    refresh,
    updateIntegration,
    deleteIntegration,
  } = useIntegrations({ tenantId, initialIntegrations, toast });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          <h2 className="font-headline text-lg font-semibold">
            Agent Integrations
          </h2>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <p className="text-sm text-foreground/60">
        External service integrations configured by your agents. Agents can set up
        new integrations via chat — just provide them an API key and ask them to connect.
      </p>

      {integrations.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
          <Plug className="w-8 h-8 text-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-foreground/60 mb-1">No integrations yet</p>
          <p className="text-xs text-foreground/40">
            Ask an agent to set up an integration — for example: &quot;Connect to our
            Discourse community and track daily metrics&quot;
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onToggleStatus={(id, status) =>
                updateIntegration(id, { status })
              }
              onDelete={deleteIntegration}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
