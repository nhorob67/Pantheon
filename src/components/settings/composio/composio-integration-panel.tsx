"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import type { ComposioConfig, ComposioConnectedApp } from "@/types/composio";
import { COMPOSIO_TOOLKITS } from "@/lib/composio/toolkits";
import { useToast } from "@/components/ui/toast";
import { ComposioHeroCard } from "./composio-hero-card";
import { ComposioToolkitGrid } from "./composio-toolkit-grid";
import { ComposioConnectedAccounts } from "./composio-connected-accounts";
import { ComposioTrustDisclosure } from "./composio-trust-disclosure";

interface Props {
  tenantId: string;
  initialConfig: ComposioConfig | null;
}

function extractError(payload: Record<string, unknown>): string | undefined {
  const inner = payload?.data as Record<string, unknown> | undefined;
  const err = payload?.error ?? inner?.error;
  return typeof err === "object" && err !== null
    ? (err as { message?: string }).message
    : (err as string | undefined);
}

function extractField<T>(payload: Record<string, unknown>, key: string): T | undefined {
  const inner = payload?.data as Record<string, unknown> | undefined;
  return ((inner?.[key] ?? payload?.[key]) as T | undefined);
}

export function ComposioIntegrationPanel({ tenantId, initialConfig }: Props) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ComposioConfig | null>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [selectedToolkits, setSelectedToolkits] = useState<string[]>(
    initialConfig?.selected_toolkits || []
  );
  const [connections, setConnections] = useState<ComposioConnectedApp[]>(
    initialConfig?.connected_apps || []
  );
  const [savingToolkits, setSavingToolkits] = useState(false);

  const enabled = config?.enabled ?? false;

  const handleEnable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/composio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data) || "Failed to enable integration");
      setConfig(extractField<ComposioConfig>(data, "config") ?? null);
      toast("Composio integration enabled", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to enable integration",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  const handleDisable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/composio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data) || "Failed to disable integration");
      setConfig(extractField<ComposioConfig>(data, "config") ?? null);
      toast("Composio integration disabled", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to disable integration",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  const handleReEnable = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/composio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data) || "Failed to enable integration");
      setConfig(extractField<ComposioConfig>(data, "config") ?? null);
      toast("Composio integration enabled", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to enable integration",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  const handleToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        if (config) {
          handleReEnable();
        } else {
          handleEnable();
        }
      } else {
        handleDisable();
      }
    },
    [config, handleEnable, handleReEnable, handleDisable]
  );

  const handleSaveToolkits = useCallback(async () => {
    setSavingToolkits(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/composio/toolkits`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected_toolkits: selectedToolkits }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data) || "Failed to save toolkits");
      setConfig(extractField<ComposioConfig>(data, "config") ?? null);
      toast("Toolkits saved and config updated", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to save toolkits",
        "error"
      );
    } finally {
      setSavingToolkits(false);
    }
  }, [tenantId, selectedToolkits, toast]);

  const handleConnect = useCallback(
    async (appId: string) => {
      try {
        const res = await fetch(
          `/api/tenants/${tenantId}/composio/connect`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ app_id: appId }),
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(extractError(data) || "Failed to start connection");

        const redirectUrl = extractField<string>(data, "redirect_url");

        // Open OAuth in popup
        const popup = window.open(
          redirectUrl,
          "composio-oauth",
          "width=600,height=700,scrollbars=yes"
        );

        if (!popup) {
          // Popup blocked — fall back to redirect
          if (redirectUrl) window.location.href = redirectUrl;
          return;
        }
      } catch (err) {
        toast(
          err instanceof Error ? err.message : "Failed to start connection",
          "error"
        );
      }
    },
    [tenantId, toast]
  );

  const refreshConnections = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/composio/connections`
      );
      const data = await res.json();
      if (res.ok) {
        setConnections(extractField<ComposioConnectedApp[]>(data, "connections") ?? []);
      }
    } catch {
      // Silent refresh failure
    }
  }, [tenantId]);

  const handleDisconnect = useCallback(
    async (appId: string) => {
      const connection = connections.find((c) => c.app_id === appId);
      if (!connection) return;

      try {
        const res = await fetch(
          `/api/tenants/${tenantId}/composio/connections?connection_id=${appId}`,
          { method: "DELETE" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(extractError(data) || "Failed to disconnect");
        toast("Service disconnected", "success");
        refreshConnections();
      } catch (err) {
        toast(
          err instanceof Error ? err.message : "Failed to disconnect",
          "error"
        );
      }
    },
    [tenantId, connections, toast, refreshConnections]
  );

  // Listen for OAuth popup completion
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "composio-oauth-complete") {
        refreshConnections();
        if (event.data.success) {
          toast("Service connected successfully", "success");
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [refreshConnections, toast]);

  const connectedCount = connections.filter(
    (c) => c.status === "connected"
  ).length;

  const sortedSelectedToolkits = useMemo(
    () => [...selectedToolkits].sort(),
    [selectedToolkits]
  );
  const sortedConfigToolkits = useMemo(
    () => [...(config?.selected_toolkits || [])].sort(),
    [config?.selected_toolkits]
  );

  const toolkitsChanged =
    sortedSelectedToolkits.length !== sortedConfigToolkits.length ||
    sortedSelectedToolkits.some(
      (toolkit, index) => toolkit !== sortedConfigToolkits[index]
    );

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
