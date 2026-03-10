"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComposioConfig, ComposioConnectedApp } from "@/types/composio";

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

interface ToastFn {
  (message: string, variant: "success" | "error"): void;
}

export function useComposioIntegration(opts: {
  tenantId: string;
  initialConfig: ComposioConfig | null;
  toast: ToastFn;
}) {
  const { tenantId, initialConfig, toast } = opts;

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

  const mutateComposio = useCallback(
    async (method: "POST" | "PUT", body: Record<string, unknown>, successMsg: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tenants/${tenantId}/composio`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        const failMsg = method === "POST" ? "Failed to enable integration" : `Failed to ${body.enabled === false ? "disable" : "enable"} integration`;
        if (!res.ok) throw new Error(extractError(data) || failMsg);
        setConfig(extractField<ComposioConfig>(data, "config") ?? null);
        toast(successMsg, "success");
      } catch (err) {
        toast(
          err instanceof Error ? err.message : "Operation failed",
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [tenantId, toast]
  );

  const handleToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        if (config) {
          mutateComposio("PUT", { enabled: true }, "Composio integration enabled");
        } else {
          mutateComposio("POST", {}, "Composio integration enabled");
        }
      } else {
        mutateComposio("PUT", { enabled: false }, "Composio integration disabled");
      }
    },
    [config, mutateComposio]
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

  useEffect(() => {
    if (enabled) {
      void refreshConnections();
    }
  }, [enabled, refreshConnections]);

  const handleDisconnect = useCallback(
    async (connectionId: string) => {
      const connection = connections.find((c) => c.id === connectionId);
      if (!connection) return;

      try {
        const res = await fetch(
          `/api/tenants/${tenantId}/composio/connections?connection_id=${connectionId}`,
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

  const toolkitsChanged = useMemo(() => {
    const sorted = [...selectedToolkits].sort();
    const configSorted = [...(config?.selected_toolkits || [])].sort();
    return (
      sorted.length !== configSorted.length ||
      sorted.some((toolkit, index) => toolkit !== configSorted[index])
    );
  }, [selectedToolkits, config?.selected_toolkits]);

  return {
    config,
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
  };
}
