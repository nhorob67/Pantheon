"use client";

import React from "react";
import type { ComposioConfig } from "@/types/composio";
import { COMPOSIO_TOOLKITS } from "@/lib/composio/toolkits";
import { useToast } from "@/components/ui/toast";
import { useComposioIntegration } from "@/hooks/use-composio-integration";
import { ComposioHeroCard } from "./composio-hero-card";
import { ComposioToolkitGrid } from "./composio-toolkit-grid";
import { ComposioConnectedAccounts } from "./composio-connected-accounts";
import { ComposioTrustDisclosure } from "./composio-trust-disclosure";

interface Props {
  tenantId: string;
  initialConfig: ComposioConfig | null;
}

export function ComposioIntegrationPanel({ tenantId, initialConfig }: Props) {
  const { toast } = useToast();

  const {
    enabled,
    loading,
    selectedToolkits,
    setSelectedToolkits,
    connections,
    savingToolkits,
    connectedCount,
    toolkitsChanged,
    handleToggle,
    handleSaveToolkits,
    handleConnect,
    handleDisconnect,
    refreshConnections,
  } = useComposioIntegration({ tenantId, initialConfig, toast });

  return (
    <div className="space-y-6">
      <ComposioHeroCard
        enabled={enabled}
        loading={loading}
        onToggle={handleToggle}
        toolkitCount={COMPOSIO_TOOLKITS.length}
        connectedCount={connectedCount}
      />

      {enabled && (
        <>
          <ComposioToolkitGrid
            selectedToolkits={selectedToolkits}
            onSelectionChange={setSelectedToolkits}
            onSave={handleSaveToolkits}
            saving={savingToolkits}
            hasChanges={toolkitsChanged}
          />

          <ComposioConnectedAccounts
            selectedToolkits={selectedToolkits}
            connections={connections}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onRefresh={refreshConnections}
          />

          <ComposioTrustDisclosure />
        </>
      )}
    </div>
  );
}
