"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmailIdentity {
  slug: string;
  address: string;
  sender_alias: string;
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
    setEnabling(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/customers/email-identity", {
        method: "POST",
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
          <h3 className="font-headline text-lg font-semibold mb-1">
            Optional Email Ingestion
          </h3>
          <p className="text-foreground/60 text-sm">
            Onboarding stays focused on Discord. Enable this only when you want
            to send files to FarmClaw by email.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted px-4 py-3">
          <p className="text-xs text-foreground/60 mb-1">Status</p>
          <p className="text-sm text-foreground">Not enabled yet</p>
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
        <h3 className="font-headline text-lg font-semibold mb-1">
          Optional Email Inbox
        </h3>
        <p className="text-foreground/60 text-sm">
          Use this address when you want to email files to your assistant. You
          can edit the slug at any time.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Address slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          error={error || undefined}
          placeholder="your-farm-name"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />

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
        <Button type="button" onClick={saveSlug} loading={saving}>
          Save Email Slug
        </Button>
        <Button type="button" variant="secondary" onClick={copyAddress}>
          Copy Address
        </Button>
        {error && <span className="text-sm text-destructive self-center">{error}</span>}
        {notice && <span className="text-sm text-primary self-center">{notice}</span>}
      </div>
    </div>
  );
}
