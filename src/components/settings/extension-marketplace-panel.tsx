"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type ExtensionSourceType = "local" | "npm" | "git" | "clawhub" | "internal";

interface SourceOption {
  value: ExtensionSourceType;
  label: string;
  description: string;
  supportsVerification: boolean;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    value: "internal",
    label: "FarmClaw Internal",
    description: "First-party extensions managed by FarmClaw.",
    supportsVerification: false,
  },
  {
    value: "local",
    label: "Local",
    description: "Extensions bundled directly with your hosted instance image.",
    supportsVerification: false,
  },
  {
    value: "clawhub",
    label: "ClawHub",
    description: "Marketplace-hosted third-party extension packages.",
    supportsVerification: true,
  },
  {
    value: "npm",
    label: "NPM",
    description: "Node package registry sources.",
    supportsVerification: true,
  },
  {
    value: "git",
    label: "Git",
    description: "Git repositories pinned by catalog reference.",
    supportsVerification: true,
  },
];

interface ExtensionTrustPolicy {
  allowed_source_types: ExtensionSourceType[];
  require_verified_source_types: ExtensionSourceType[];
}

interface CatalogItem {
  id: string;
  slug: string;
  kind: string;
  display_name: string;
  source_type: string;
  verified: boolean;
  latest_version: string | null;
}

interface InstallationRow {
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

function statusVariant(status: string): "success" | "warning" | "error" | "neutral" {
  if (status === "installed" || status === "rolled_back") return "success";
  if (status === "failed") return "error";
  if (status.includes("pending") || status.includes("ing")) return "warning";
  return "neutral";
}

function orderedSourceTypes(enabled: Set<ExtensionSourceType>): ExtensionSourceType[] {
  return SOURCE_OPTIONS.map((source) => source.value).filter((value) => enabled.has(value));
}

export function ExtensionMarketplacePanel() {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [installations, setInstallations] = useState<InstallationRow[]>([]);
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
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
      setCatalog(catalogPayload.items || []);
      setInstallations(installationsPayload.installations || []);
      setAllowedSourceTypes(new Set(trustPolicy?.allowed_source_types || []));
      setRequireVerifiedSourceTypes(
        new Set(trustPolicy?.require_verified_source_types || [])
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load extensions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      await refresh();
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
      await refresh();
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Extensions</h3>
        <p className="text-foreground/60 text-sm">
          Install and manage marketplace extensions for your Discord assistant.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {notice}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-headline text-sm font-semibold uppercase tracking-wider text-foreground/70">
              Trust Policy
            </h4>
            <p className="text-xs text-foreground/60 mt-1">
              Control which extension source types are allowed and which require
              verification.
            </p>
          </div>
          <Button size="sm" onClick={() => void saveTrustPolicy()} loading={savingPolicy}>
            Save Policy
          </Button>
        </div>

        <div className="space-y-3">
          {SOURCE_OPTIONS.map((source) => {
            const allowed = allowedSourceTypes.has(source.value);
            const requireVerified = requireVerifiedSourceTypes.has(source.value);
            const canRequireVerification = source.supportsVerification && allowed;

            return (
              <div
                key={source.value}
                className="rounded-lg border border-border px-4 py-3 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium">{source.label}</p>
                  <p className="text-xs text-foreground/50">{source.description}</p>
                </div>
                <div className="flex items-center gap-5">
                  <Switch
                    label="Allowed"
                    checked={allowed}
                    onChange={(checked) =>
                      updateAllowedSourceType(source.value, checked)
                    }
                  />
                  <Switch
                    label="Require verified"
                    checked={requireVerified}
                    disabled={!canRequireVerification}
                    onChange={(checked) =>
                      updateRequireVerifiedSourceType(source.value, checked)
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-headline text-sm font-semibold uppercase tracking-wider text-foreground/70">
            Installed
          </h4>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refresh()}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        {!loading && installations.length === 0 && (
          <p className="text-sm text-foreground/60">No installed extensions yet.</p>
        )}

        <div className="space-y-3">
          {installations.map((installation) => (
            <div
              key={installation.id}
              className="rounded-lg border border-border px-4 py-3 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">
                    {installation.extension_catalog_items?.display_name || installation.item_id}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {installation.extension_catalog_items?.slug || "unknown"} ·{" "}
                    {installation.extension_catalog_versions?.version || "no version"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(installation.install_status)}>
                    {installation.install_status}
                  </Badge>
                  <Badge variant="neutral">{installation.health_status}</Badge>
                </div>
              </div>

              {installation.last_error && (
                <p className="text-xs text-destructive">{installation.last_error}</p>
              )}

              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busyKey === `rollback:${installation.id}`}
                  onClick={() => void queueRollback(installation.id)}
                >
                  Queue Rollback
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
        <h4 className="font-headline text-sm font-semibold uppercase tracking-wider text-foreground/70">
          Catalog
        </h4>

        {loading && <p className="text-sm text-foreground/60">Loading catalog...</p>}

        <div className="space-y-3">
          {catalog.map((item) => {
            const installation = installationByItemId.get(item.id);
            const actionLabel = installation ? "Queue Upgrade" : "Install";
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-sm">{item.display_name}</p>
                  <p className="text-xs text-foreground/50">
                    {item.slug} · {item.kind} · {item.source_type} · latest{" "}
                    {item.latest_version || "n/a"}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {item.verified ? (
                      <Badge variant="success">verified</Badge>
                    ) : (
                      <Badge variant="warning">unverified</Badge>
                    )}
                    {installation && (
                      <Badge variant={statusVariant(installation.install_status)}>
                        {installation.install_status}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  loading={busyKey === `install:${item.id}`}
                  onClick={() => void queueInstallOrUpgrade(item.id)}
                >
                  {actionLabel}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
