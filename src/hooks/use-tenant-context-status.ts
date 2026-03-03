"use client";

import { useCallback, useEffect, useState } from "react";
import { POLLING_INTERVAL } from "@/lib/utils/constants";

interface TenantContextStatus {
  tenant: {
    id: string;
    status: string;
  };
  runtime_gates: {
    reads_enabled: boolean;
    writes_enabled: boolean;
    discord_ingress_paused: boolean;
    tool_execution_paused: boolean;
    memory_writes_paused: boolean;
  };
}

export function useTenantContextStatus(tenantId: string | null) {
  const [status, setStatus] = useState<TenantContextStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!tenantId) return;

    try {
      const res = await fetch(`/api/tenants/${tenantId}/context`);
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(
          payload?.error?.message || payload?.error || "Failed to fetch tenant status"
        );
      }

      const data = payload?.data;
      if (!data || typeof data !== "object") {
        throw new Error("Invalid tenant status payload");
      }

      setStatus(data as TenantContextStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
