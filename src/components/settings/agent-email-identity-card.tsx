"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmailIdentity {
  slug: string;
  address: string;
  sender_alias: string;
  is_active: boolean;
  is_locked: boolean;
}

function normalizeIdentity(
  value: Partial<EmailIdentity> & {
    slug?: string;
    address?: string;
    sender_alias?: string;
    provider_mailbox_id?: string | null;
    is_active?: boolean;
  }
): EmailIdentity {
  return {
    slug: value.slug || "",
    address: value.address || "",
    sender_alias: value.sender_alias || value.address || "",
    is_active: value.is_active ?? true,
    is_locked: value.is_locked ?? Boolean(value.provider_mailbox_id),
  };
}

interface AgentEmailIdentityCardProps {
  tenantId: string;
  agentId: string;
  agentName: string;
  agentRole: string | null;
  initialIdentity: EmailIdentity | null;
}

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export function AgentEmailIdentityCard({
  tenantId,
  agentId,
  agentName,
  agentRole,
  initialIdentity,
}: AgentEmailIdentityCardProps) {
  const [identity, setIdentity] = useState<EmailIdentity | null>(initialIdentity);
  const [slug, setSlug] = useState(initialIdentity?.slug || "");
  const [saving, setSaving] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apiBase = `/api/tenants/${tenantId}/agents/${agentId}/email-identity`;

  const enableIdentity = async () => {
    const cleaned = slug.trim().toLowerCase();
    const validationError =
      !identity && cleaned && !SLUG_REGEX.test(cleaned)
        ? "Use 3-63 characters: lowercase letters, numbers, and hyphens"
        : null;
    if (validationError) {
      setError(validationError);
      setNotice(null);
      return;
    }

    setEnabling(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: cleaned }),
      });
      const payload = await res.json();
      const data = payload.data ?? payload;

      if (!res.ok || !data.identity) {
        throw new Error(
          data.error?.message || data.error || "Failed to enable email address"
        );
      }

      setIdentity(normalizeIdentity(data.identity));
      setSlug(data.identity.slug);
      setNotice(identity?.is_active ? "Email address already enabled" : "Email address enabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable email address");
    } finally {
      setEnabling(false);
    }
  };

  const saveSlug = async () => {
    if (!identity || !identity.is_active || identity.is_locked) return;

    const cleaned = slug.trim().toLowerCase();
    if (!SLUG_REGEX.test(cleaned)) {
      setError("Use 3-63 characters: lowercase letters, numbers, and hyphens");
      setNotice(null);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: cleaned }),
      });

      const payload = await res.json();
      const data = payload.data ?? payload;

      if (!res.ok || !data.identity) {
        throw new Error(
          data.error?.message || data.error || "Failed to update email address"
        );
      }

      setIdentity(normalizeIdentity(data.identity));
      setSlug(data.identity.slug);
      setNotice("Email address updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email address");
    } finally {
      setSaving(false);
    }
  };

  const disableIdentity = async () => {
    if (!identity) {
      return;
    }

    setDisabling(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(apiBase, { method: "DELETE" });
      const payload = await res.json();
      const data = payload.data ?? payload;

      if (!res.ok) {
        throw new Error(
          data.error?.message || data.error || "Failed to disable email address"
        );
      }

      setIdentity({
        ...identity,
        is_active: false,
      });
      setSlug(identity.slug);
      setNotice("Email address disabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable email address");
    } finally {
      setDisabling(false);
    }
  };

  const copyAddress = async () => {
    if (!identity) return;

    try {
      await navigator.clipboard.writeText(identity.address);
      setNotice("Address copied");
      setError(null);
    } catch {
      setError("Failed to copy address");
    }
  };

  const isActive = identity?.is_active ?? false;
  const hasIdentity = identity !== null;
  const canEditSlug = Boolean(identity && isActive && !identity.is_locked);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-headline text-base font-medium">{agentName}</h3>
          {agentRole && (
            <p className="text-foreground/50 text-sm">{agentRole}</p>
          )}
        </div>
        {hasIdentity && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              isActive
                ? "text-primary bg-primary/10"
                : "text-foreground/70 bg-muted"
            }`}
          >
            {isActive ? "Active" : "Disabled"}
          </span>
        )}
      </div>

      {!hasIdentity ? (
        <div className="space-y-3">
          <Input
            label="Address slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            error={error || undefined}
            placeholder="team-agent-name"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="text-xs text-foreground/60">
            Choose the slug before enabling. AgentMail inbox addresses cannot
            be renamed later.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={enableIdentity}
              loading={enabling}
            >
              Enable Email
            </Button>
            {error && <span className="text-sm text-destructive">{error}</span>}
            {notice && <span className="text-sm text-primary">{notice}</span>}
          </div>
        </div>
      ) : !isActive ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted px-3 py-2">
            <p className="text-xs text-foreground/60 mb-0.5">Email address</p>
            <p className="font-mono text-sm text-foreground break-all">
              {identity.address}
            </p>
          </div>
          <p className="text-xs text-foreground/60">
            Re-enabling will restore the same inbox and address.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={enableIdentity}
            loading={enabling}
          >
            Re-enable Email
          </Button>
          {error && <span className="text-sm text-destructive">{error}</span>}
          {notice && <span className="text-sm text-primary">{notice}</span>}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {canEditSlug ? (
              <Input
                label="Address slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                error={error || undefined}
                placeholder="team-agent-name"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            ) : (
              <div className="rounded-lg border border-border bg-muted px-3 py-2">
                <p className="text-xs text-foreground/60 mb-0.5">Address slug</p>
                <p className="font-mono text-sm text-foreground break-all">
                  {identity.slug}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted px-3 py-2">
              <p className="text-xs text-foreground/60 mb-0.5">Current address</p>
              <p className="font-mono text-sm text-foreground break-all">
                {identity.address}
              </p>
            </div>
            {identity.is_locked && (
              <p className="text-xs text-foreground/60">
                AgentMail inbox addresses cannot be renamed after provisioning.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {canEditSlug && (
              <Button type="button" size="sm" onClick={saveSlug} loading={saving}>
                Save
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={copyAddress}
            >
              Copy Address
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={disableIdentity}
              loading={disabling}
            >
              Disable
            </Button>
            {error && (
              <span className="text-sm text-destructive">{error}</span>
            )}
            {!error && notice && (
              <span className="text-sm text-primary">{notice}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
