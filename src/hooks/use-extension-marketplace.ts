"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type { ExtensionSourceType, ExtensionTrustPolicy } from "@/types/extensibility";

export interface CatalogItem {
  id: string;
  slug: string;
  kind: string;
  display_name: string;
  source_type: string;
  verified: boolean;
  latest_version: string | null;
}

export interface InstallationRow {
  id: string;
  item_id: string;
  install_status: string;
  health_status: string;
  last_error: string | null;
  updated_at: string;
  extension_catalog_items: {
    id: string;
    slug: string;
    display_name: string;
    kind: string;
    source_type: string;
    verified: boolean;
  } | null;
  extension_catalog_versions: {
    id: string;
    version: string;
    published_at: string;
  } | null;
}

const SOURCE_ORDER: ExtensionSourceType[] = [
  "internal",
  "local",
  "clawhub",
  "npm",
  "git",
];

function orderedSourceTypes(enabled: Set<ExtensionSourceType>): ExtensionSourceType[] {
  return SOURCE_ORDER.filter((value) => enabled.has(value));
}

interface MarketplaceData {
  catalog: CatalogItem[];
  installations: InstallationRow[];
  allowedSourceTypes: ExtensionSourceType[];
  requireVerifiedSourceTypes: ExtensionSourceType[];
}

const marketplaceFetcher = async (): Promise<MarketplaceData> => {
  const [catalogRes, installationsRes, trustPolicyRes] = await Promise.all([
    fetch("/api/extensions/catalog?active=true&page=1&per_page=100"),
    fetch("/api/extensions/installations"),
    fetch("/api/extensions/trust-policy"),
  ]);

  const catalogPayload = (await catalogRes.json()) as {
    items?: CatalogItem[];
    error?: string;
  };
  const installationsPayload = (await installationsRes.json()) as {
    installations?: InstallationRow[];
    error?: string;
  };
  const trustPolicyPayload = (await trustPolicyRes.json()) as {
    policy?: ExtensionTrustPolicy;
    error?: string;
  };

  if (!catalogRes.ok) {
    throw new Error(catalogPayload.error || "Failed to load extension catalog");
  }
  if (!installationsRes.ok) {
    throw new Error(installationsPayload.error || "Failed to load installed extensions");
  }
  if (!trustPolicyRes.ok) {
    throw new Error(trustPolicyPayload.error || "Failed to load extension trust policy");
  }

  const trustPolicy = trustPolicyPayload.policy;
  return {
    catalog: catalogPayload.items || [],
    installations: installationsPayload.installations || [],
    allowedSourceTypes: trustPolicy?.allowed_source_types || [],
    requireVerifiedSourceTypes: trustPolicy?.require_verified_source_types || [],
  };
};

export function useExtensionMarketplace() {
  const { data, error: swrError, isLoading: loading, mutate } = useSWR(
    "extensions-marketplace",
    marketplaceFetcher,
    { revalidateOnFocus: true }
  );

  const catalog = data?.catalog || [];
  const installations = useMemo(() => data?.installations || [], [data?.installations]);

  const [allowedSourceTypes, setAllowedSourceTypes] = useState<
    Set<ExtensionSourceType>
  >(new Set());
  const [requireVerifiedSourceTypes, setRequireVerifiedSourceTypes] = useState<
    Set<ExtensionSourceType>
  >(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Sync trust policy state from SWR data on first load
  const [policyInitialized, setPolicyInitialized] = useState(false);
  useEffect(() => {
    if (data && !policyInitialized) {
      setAllowedSourceTypes(new Set(data.allowedSourceTypes));
      setRequireVerifiedSourceTypes(new Set(data.requireVerifiedSourceTypes));
      setPolicyInitialized(true);
    }
  }, [data, policyInitialized]);

  const effectiveError = error || (swrError ? swrError.message : null);

  const installationByItemId = useMemo(() => {
    return new Map(installations.map((row) => [row.item_id, row]));
  }, [installations]);

  const queueInstallOrUpgrade = async (itemId: string) => {
    setBusyKey(`install:${itemId}`);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch("/api/extensions/installations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, pin_version: false }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Failed to queue install");
      }

      setNotice("Queued extension operation");
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue install");
    } finally {
      setBusyKey(null);
    }
  };

  const queueRollback = async (installationId: string) => {
    setBusyKey(`rollback:${installationId}`);
    setNotice(null);
    setError(null);

    try {
      const res = await fetch(`/api/extensions/installations/${installationId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Failed to queue rollback");
      }

      setNotice("Queued rollback operation");
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue rollback");
    } finally {
      setBusyKey(null);
    }
  };

  const updateAllowedSourceType = (sourceType: ExtensionSourceType, checked: boolean) => {
    setError(null);
    setNotice(null);

    setAllowedSourceTypes((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(sourceType);
      } else {
        if (current.has(sourceType) && current.size === 1) {
          setError("At least one source type must remain allowed.");
          return current;
        }
        next.delete(sourceType);
      }

      return next;
    });

    if (!checked) {
      setRequireVerifiedSourceTypes((current) => {
        const next = new Set(current);
        next.delete(sourceType);
        return next;
      });
    }
  };

  const updateRequireVerifiedSourceType = (
    sourceType: ExtensionSourceType,
    checked: boolean
  ) => {
    setError(null);
    setNotice(null);

    setRequireVerifiedSourceTypes((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(sourceType);
      } else {
        next.delete(sourceType);
      }
      return next;
    });
  };

  const saveTrustPolicy = async () => {
    const allowed = orderedSourceTypes(allowedSourceTypes);
    const requireVerified = orderedSourceTypes(requireVerifiedSourceTypes).filter(
      (sourceType) => allowed.includes(sourceType)
    );

    if (allowed.length === 0) {
      setError("At least one source type must remain allowed.");
      return;
    }

    setSavingPolicy(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/extensions/trust-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowed_source_types: allowed,
          require_verified_source_types: requireVerified,
        }),
      });

      const payload = (await res.json()) as {
        policy?: ExtensionTrustPolicy;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(payload.error || "Failed to save trust policy");
      }

      const policy = payload.policy;
      setAllowedSourceTypes(new Set(policy?.allowed_source_types || []));
      setRequireVerifiedSourceTypes(
        new Set(policy?.require_verified_source_types || [])
      );
      setNotice("Saved extension trust policy.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save trust policy");
    } finally {
      setSavingPolicy(false);
    }
  };

  return {
    loading,
    catalog,
    installations,
    installationByItemId,
    allowedSourceTypes,
    requireVerifiedSourceTypes,
    error: effectiveError,
    busyKey,
    notice,
    savingPolicy,
    refresh: mutate,
    queueInstallOrUpgrade,
    queueRollback,
    updateAllowedSourceType,
    updateRequireVerifiedSourceType,
    saveTrustPolicy,
  };
}
