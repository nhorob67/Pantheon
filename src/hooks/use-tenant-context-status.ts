"use client";

import useSWR from "swr";
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

const fetcher = async (url: string): Promise<TenantContextStatus> => {
  const res = await fetch(url);
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

  return data as TenantContextStatus;
};

export function useTenantContextStatus(tenantId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    tenantId ? `/api/tenants/${tenantId}/context` : null,
    fetcher,
    {
      refreshInterval: POLLING_INTERVAL,
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    }
  );

  return {
    status: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch: mutate,
  };
}
