"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useExtensionMarketplace } from "@/hooks/use-extension-marketplace";

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

function statusVariant(status: string): "success" | "warning" | "error" | "neutral" {
  if (status === "installed" || status === "rolled_back") return "success";
  if (status === "failed") return "error";
  if (status.includes("pending") || status.includes("ing")) return "warning";
  return "neutral";
}

export function ExtensionMarketplacePanel() {
  const {
    loading,
    catalog,
    installations,
    installationByItemId,
    allowedSourceTypes,
    requireVerifiedSourceTypes,
    error,
    busyKey,
    notice,
    savingPolicy,
    refresh,
    queueInstallOrUpgrade,
    queueRollback,
    updateAllowedSourceType,
    updateRequireVerifiedSourceType,
    saveTrustPolicy,
  } = useExtensionMarketplace();

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
