"use client";

import { useCallback, useState } from "react";
import type { IntegrationSummary } from "@/types/integration";

interface ToastFn {
  (message: string, variant: "success" | "error"): void;
}

export function useIntegrations(opts: {
  tenantId: string;
  initialIntegrations: IntegrationSummary[];
  toast: ToastFn;
}) {
  const { tenantId, toast } = opts;
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>(
    opts.initialIntegrations
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/integrations`);
      const json = await res.json();
      if (res.ok && json.integrations) {
        setIntegrations(json.integrations);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const updateIntegration = useCallback(
    async (integrationId: string, updates: Record<string, unknown>) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/tenants/${tenantId}/integrations/${integrationId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }
        );
        if (res.ok) {
          toast("Integration updated", "success");
          await refresh();
        } else {
          const json = await res.json();
          toast(json.error || "Failed to update integration", "error");
        }
      } catch {
        toast("Failed to update integration", "error");
      } finally {
        setLoading(false);
      }
    },
    [tenantId, toast, refresh]
  );

  const deleteIntegration = useCallback(
    async (integrationId: string) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/tenants/${tenantId}/integrations/${integrationId}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          toast("Integration removed", "success");
          setIntegrations((prev) => prev.filter((i) => i.id !== integrationId));
        } else {
          const json = await res.json();
          toast(json.error || "Failed to remove integration", "error");
        }
      } catch {
        toast("Failed to remove integration", "error");
      } finally {
        setLoading(false);
      }
    },
    [tenantId, toast]
  );

  return {
    integrations,
    loading,
    refresh,
    updateIntegration,
    deleteIntegration,
  };
}
