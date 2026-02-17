"use client";

import { useState, useEffect, useCallback } from "react";
import type { InstanceStatus } from "@/types/instance";
import { POLLING_INTERVAL } from "@/lib/utils/constants";

export function useInstanceStatus(instanceId: string | null) {
  const [status, setStatus] = useState<InstanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!instanceId) return;

    try {
      const res = await fetch(`/api/instances/${instanceId}/status`);
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
