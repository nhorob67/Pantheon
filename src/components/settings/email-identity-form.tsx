"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmailIdentity {
  slug: string;
  address: string;
  sender_alias: string;
  provider_mailbox_id?: string | null;
}

interface EmailIdentityFormProps {
  initialIdentity: EmailIdentity | null;
}

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export function EmailIdentityForm({ initialIdentity }: EmailIdentityFormProps) {
  const [identity, setIdentity] = useState<EmailIdentity | null>(initialIdentity);
  const [slug, setSlug] = useState(initialIdentity?.slug || "");
  const [saving, setSaving] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const validateSlug = (value: string): string | null => {
    const trimmed = value.trim().toLowerCase();
    if (!SLUG_REGEX.test(trimmed)) {
      return "Use 3-63 characters: lowercase letters, numbers, and hyphens";
    }
    return null;
  };

  const enableIdentity = async () => {
    const cleaned = slug.trim().toLowerCase();
    const validationError = cleaned ? validateSlug(cleaned) : null;
    if (validationError) {
      setError(validationError);
      setNotice(null);
      return;
    }

    setEnabling(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/customers/email-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: cleaned }),
      });
      const payload = (await res.json()) as {
        identity?: EmailIdentity;
        error?: string;
      };

      if (!res.ok || !payload.identity) {
        throw new Error(payload.error || "Failed to enable email address");
      }

      setIdentity(payload.identity);
      setSlug(payload.identity.slug);
      setNotice("Email address enabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable email address");
    } finally {
      setEnabling(false);
    }
  };

  const saveSlug = async () => {
    if (!identity) {
      setError("Enable email first");
      setNotice(null);
      return;
    }

    const cleaned = slug.trim().toLowerCase();
    const validationError = validateSlug(cleaned);
    if (validationError) {
      setError(validationError);
      setNotice(null);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/customers/email-identity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: cleaned }),
      });

      const payload = (await res.json()) as {
        identity?: EmailIdentity;
        error?: string;
      };

      if (!res.ok || !payload.identity) {
        throw new Error(payload.error || "Failed to update email address");
      }

      setIdentity(payload.identity);
      setSlug(payload.identity.slug);
      setNotice("Email address updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email address");
    } finally {
      setSaving(false);
    }
  };

  const copyAddress = async () => {
    if (!identity) {
      setError("Enable email first");
      return;
    }

    try {
      await navigator.clipboard.writeText(identity.address);
      setNotice("Address copied");
      setError(null);
    } catch {
      setError("Failed to copy address");
    }
  };

  if (!identity) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
        <div>
          <h3 className="font-headline text-lg mb-1">
            Team Email Address
          </h3>
          <p className="text-foreground/60 text-sm">
            This email address is used by your default agent. Enable this to
            receive and respond to emails via Pantheon.
          </p>
        </div>

        <Input
          label="Address slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          error={error || undefined}
          placeholder="your-team-name"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />

        <div className="rounded-lg border border-border bg-muted px-4 py-3">
          <p className="text-xs text-foreground/60 mb-1">Status</p>
          <p className="text-sm text-foreground">
            Not enabled yet. Choose a slug before enabling because AgentMail
            inbox addresses cannot be renamed later.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={enableIdentity} loading={enabling}>
            Enable Email Inbox
          </Button>
          {error && <span className="text-sm text-destructive self-center">{error}</span>}
          {notice && <span className="text-sm text-primary self-center">{notice}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
      <div>
        <h3 className="font-headline text-lg mb-1">
          Team Email Address
        </h3>
        <p className="text-foreground/60 text-sm">
          This address is used by your default agent. AgentMail inbox slugs are
          locked after provisioning.
        </p>
      </div>

      <div className="space-y-4">
        {identity.provider_mailbox_id ? (
          <div className="rounded-lg border border-border bg-muted px-4 py-3">
            <p className="text-xs text-foreground/60 mb-1">Address slug</p>
            <p className="font-mono text-sm text-foreground break-all">{identity.slug}</p>
          </div>
        ) : (
          <Input
            label="Address slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            error={error || undefined}
            placeholder="your-team-name"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        )}

        <div className="rounded-lg border border-border bg-muted px-4 py-3">
          <p className="text-xs text-foreground/60 mb-1">Current address</p>
          <p className="font-mono text-sm text-foreground break-all">{identity.address}</p>
        </div>

        <div className="rounded-lg border border-border bg-muted px-4 py-3">
          <p className="text-xs text-foreground/60 mb-1">Sender alias</p>
          <p className="font-mono text-sm text-foreground break-all">
            {identity.sender_alias}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {!identity.provider_mailbox_id && (
          <Button type="button" onClick={saveSlug} loading={saving}>
            Save Email Slug
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={copyAddress}>
          Copy Address
        </Button>
        {error && <span className="text-sm text-destructive self-center">{error}</span>}
        {notice && <span className="text-sm text-primary self-center">{notice}</span>}
      </div>
    </div>
  );
}
