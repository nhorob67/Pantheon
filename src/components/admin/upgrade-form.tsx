"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UpgradeFormProps {
  runningInstanceCount: number;
}

export function UpgradeForm({ runningInstanceCount }: UpgradeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetVersion, setTargetVersion] = useState("");
  const [dockerImage, setDockerImage] = useState("farmclaw/openclaw:");
  const [concurrency, setConcurrency] = useState(3);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/admin/upgrades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_version: targetVersion,
        docker_image: dockerImage,
        concurrency,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create upgrade");
      setLoading(false);
      return;
    }

    router.push(`/admin/upgrades/${data.upgrade.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Target Version
        </label>
        <input
          type="text"
          value={targetVersion}
          onChange={(e) => setTargetVersion(e.target.value)}
          placeholder="e.g. v1.2.0"
          required
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Docker Image
        </label>
        <input
          type="text"
          value={dockerImage}
          onChange={(e) => setDockerImage(e.target.value)}
          placeholder="farmclaw/openclaw:v1.2.0"
          required
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Concurrency
        </label>
        <input
          type="number"
          value={concurrency}
          onChange={(e) => setConcurrency(Number(e.target.value))}
          min={1}
          max={20}
          className="w-24 px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-xs text-foreground/50 mt-1">
          Number of instances to upgrade per batch
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <p className="text-sm text-foreground/70">
          <span className="font-mono font-semibold text-foreground">
            {runningInstanceCount}
          </span>{" "}
          running instance{runningInstanceCount !== 1 ? "s" : ""} will be
          affected
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || runningInstanceCount === 0}
        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Upgrade"}
      </button>
    </form>
  );
}
