"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type ExportScope = "full" | "knowledge_only" | "metadata_only";
type ExportFormat = "jsonl" | "csv";
type ExportStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "expired"
  | "canceled";

interface ExportRecord {
  id: string;
  export_scope: ExportScope;
  format: ExportFormat;
  include_blobs: boolean;
  status: ExportStatus;
  file_count: number;
  total_size_bytes: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  last_error: string | null;
}

interface ExportDetail {
  files: Array<{
    file_name?: string;
    size_bytes?: number;
    checksum_sha256?: string;
  }>;
  jobs: Array<{
    id: string;
    status: string;
    attempt: number;
    created_at: string;
    completed_at: string | null;
    last_error: string | null;
  }>;
  signed_urls: Record<string, string>;
}

type ImportScope = "full" | "knowledge_only" | "metadata_only";
type ImportFormat = "jsonl" | "csv";

interface ImportDryRunResult {
  accepted: boolean;
  compatibility: {
    status: "compatible" | "requires_migration" | "unsupported";
    schema_version: number;
    supported_version: number;
    message: string;
  };
  summary: {
    records_total: number;
    tables_detected: number;
    errors: number;
    warnings: number;
    unknown_tables: number;
    tenant_mismatches: number;
  };
  issues: Array<{
    severity: "error" | "warning";
    code: string;
    message: string;
    table?: string;
    record_index?: number;
  }>;
}

interface TenantExportsPanelProps {
  tenantId: string;
  initialExports: ExportRecord[];
}

function formatDate(value: string | null): string {
  if (!value) {
    return "n/a";
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return value;
  }
  return dt.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function TenantExportsPanel({
  tenantId,
  initialExports,
}: TenantExportsPanelProps) {
  const [rows, setRows] = useState<ExportRecord[]>(initialExports);
  const [scope, setScope] = useState<ExportScope>("full");
  const [format, setFormat] = useState<ExportFormat>("jsonl");
  const [includeBlobs, setIncludeBlobs] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRetryId, setPendingRetryId] = useState<string | null>(null);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ExportDetail>>({});
  const [importScope, setImportScope] = useState<ImportScope>("full");
  const [importFormat, setImportFormat] = useState<ImportFormat>("jsonl");
  const [strictTenantMatch, setStrictTenantMatch] = useState(true);
  const [failOnUnknownTables, setFailOnUnknownTables] = useState(true);
  const [selectedTablesInput, setSelectedTablesInput] = useState("");
  const [recordsInput, setRecordsInput] = useState(
    JSON.stringify(
      [
        {
          table: "tenant_knowledge_items",
          record: {
            tenant_id: tenantId,
            title: "example-note",
          },
        },
      ],
      null,
      2
    )
  );
  const [runningDryRun, setRunningDryRun] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<ImportDryRunResult | null>(null);
  const { toast } = useToast();

  const ordered = useMemo(
    () =>
      [...rows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [rows]
  );

  async function refreshExports() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/export`, { method: "GET" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to load exports");
      }
      const nextRows = Array.isArray(payload?.data?.exports)
        ? payload.data.exports
        : Array.isArray(payload?.exports)
          ? payload.exports
          : [];
      setRows(nextRows);
    } catch (error) {
      toast(
        `Failed to refresh exports: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function createExport() {
    setCreating(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          export_scope: scope,
          format,
          include_blobs: includeBlobs,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to queue export");
      }

      const exportRecord = payload?.data?.export || payload?.export;
      if (exportRecord && typeof exportRecord.id === "string") {
        setRows((current) => [exportRecord as ExportRecord, ...current]);
      } else {
        await refreshExports();
      }

      const reused = Boolean(payload?.data?.reused || payload?.reused);
      toast(reused ? "Existing export request reused" : "Tenant export queued", "success");
    } catch (error) {
      toast(
        `Failed to queue export: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setCreating(false);
    }
  }

  async function retryExport(exportId: string) {
    setPendingRetryId(exportId);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/export/${exportId}/retry`, {
        method: "POST",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to retry export");
      }

      await refreshExports();
      toast("Export retry queued", "success");
    } catch (error) {
      toast(
        `Failed to retry export: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setPendingRetryId(null);
    }
  }

  async function loadDetails(exportId: string) {
    try {
      const res = await fetch(`/api/tenants/${tenantId}/export/${exportId}`, {
        method: "GET",
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error?.message || payload?.error || "Failed to load export detail");
      }

      const files = Array.isArray(payload?.data?.files)
        ? payload.data.files
        : Array.isArray(payload?.files)
          ? payload.files
          : [];
      const jobs = Array.isArray(payload?.data?.jobs)
        ? payload.data.jobs
        : Array.isArray(payload?.jobs)
          ? payload.jobs
          : [];
      const signedUrls =
        payload?.data?.signed_urls && typeof payload.data.signed_urls === "object"
          ? (payload.data.signed_urls as Record<string, string>)
          : payload?.signed_urls && typeof payload.signed_urls === "object"
            ? (payload.signed_urls as Record<string, string>)
            : {};

      setDetails((current) => ({
        ...current,
        [exportId]: {
          files,
          jobs,
          signed_urls: signedUrls,
        },
      }));
      setActiveExportId(exportId);
    } catch (error) {
      toast(
        `Failed to load export detail: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  }

  async function runImportDryRun() {
    setRunningDryRun(true);
    try {
      let parsedRecords: unknown;
      try {
        parsedRecords = JSON.parse(recordsInput);
      } catch {
        throw new Error("Records input must be valid JSON");
      }

      if (!Array.isArray(parsedRecords)) {
        throw new Error("Records input must be a JSON array");
      }

      const selectedTables = selectedTablesInput
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      const res = await fetch(`/api/tenants/${tenantId}/import/dry-run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schema_version: 1,
          format: importFormat,
          scope: importScope,
          strict_tenant_match: strictTenantMatch,
          fail_on_unknown_tables: failOnUnknownTables,
          ...(selectedTables.length > 0 ? { selected_tables: selectedTables } : {}),
          records: parsedRecords,
        }),
      });
      const payload = await res.json();
      const result = payload?.data?.dry_run || payload?.dry_run;

      if (
        result &&
        typeof result === "object" &&
        typeof result.accepted === "boolean"
      ) {
        setDryRunResult(result as ImportDryRunResult);
      } else {
        setDryRunResult(null);
      }

      if (res.ok) {
        toast("Import dry-run accepted", "success");
        return;
      }

      if (res.status === 422 && result) {
        toast("Import dry-run returned validation issues", "error");
        return;
      }

      throw new Error(
        payload?.error?.message || payload?.error || "Failed to run import dry-run"
      );
    } catch (error) {
      toast(
        `Failed to run import dry-run: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    } finally {
      setRunningDryRun(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h4 className="font-headline text-base font-semibold text-foreground">
          Create Export
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <label className="text-sm text-foreground/70">
            Scope
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={scope}
              onChange={(event) => setScope(event.target.value as ExportScope)}
            >
              <option value="full">Full tenant</option>
              <option value="knowledge_only">Knowledge + memory</option>
              <option value="metadata_only">Metadata only</option>
            </select>
          </label>

          <label className="text-sm text-foreground/70">
            Format
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={format}
              onChange={(event) => setFormat(event.target.value as ExportFormat)}
            >
              <option value="jsonl">JSONL</option>
              <option value="csv">CSV</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground/70 md:pb-2">
            <input
              type="checkbox"
              checked={includeBlobs}
              onChange={(event) => setIncludeBlobs(event.target.checked)}
            />
            Include blobs
          </label>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              loading={creating}
              onClick={() => {
                void createExport();
              }}
            >
              Queue Export
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={refreshing}
              onClick={() => {
                void refreshExports();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h4 className="font-headline text-base font-semibold text-foreground">
          Import Dry-Run
        </h4>
        <p className="text-xs text-foreground/60">
          Validate an import payload before running a real import. This does not write data.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm text-foreground/70">
            Scope
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={importScope}
              onChange={(event) => setImportScope(event.target.value as ImportScope)}
            >
              <option value="full">Full tenant</option>
              <option value="knowledge_only">Knowledge + memory</option>
              <option value="metadata_only">Metadata only</option>
            </select>
          </label>
          <label className="text-sm text-foreground/70">
            Format
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={importFormat}
              onChange={(event) => setImportFormat(event.target.value as ImportFormat)}
            >
              <option value="jsonl">JSONL</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          <label className="text-sm text-foreground/70">
            Selected tables (optional)
            <input
              type="text"
              value={selectedTablesInput}
              onChange={(event) => setSelectedTablesInput(event.target.value)}
              placeholder="tenant_knowledge_items, tenant_memory_records"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground/70">
            <input
              type="checkbox"
              checked={strictTenantMatch}
              onChange={(event) => setStrictTenantMatch(event.target.checked)}
            />
            Strict tenant match
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground/70">
            <input
              type="checkbox"
              checked={failOnUnknownTables}
              onChange={(event) => setFailOnUnknownTables(event.target.checked)}
            />
            Fail on unknown tables
          </label>
        </div>

        <label className="block text-sm text-foreground/70">
          Records JSON
          <textarea
            value={recordsInput}
            onChange={(event) => setRecordsInput(event.target.value)}
            className="mt-1 h-56 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
            spellCheck={false}
          />
        </label>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            loading={runningDryRun}
            onClick={() => {
              void runImportDryRun();
            }}
          >
            Run Dry-Run
          </Button>
        </div>

        {dryRunResult && (
          <div className="rounded-lg border border-border bg-background/40 p-3 space-y-2 text-xs">
            <p className="font-semibold text-foreground">
              Result: {dryRunResult.accepted ? "Accepted" : "Rejected"} · Compatibility:{" "}
              {dryRunResult.compatibility.status}
            </p>
            <p className="text-foreground/70">{dryRunResult.compatibility.message}</p>
            <p className="text-foreground/70">
              Records {dryRunResult.summary.records_total} · Tables {dryRunResult.summary.tables_detected} ·
              Errors {dryRunResult.summary.errors} · Warnings {dryRunResult.summary.warnings}
            </p>
            {dryRunResult.issues.length > 0 && (
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Issues</p>
                {dryRunResult.issues.slice(0, 20).map((issue, index) => (
                  <p key={`${issue.code}-${index}`} className="text-foreground/70">
                    [{issue.severity}] {issue.code}: {issue.message}
                    {issue.table ? ` (table: ${issue.table})` : ""}
                    {typeof issue.record_index === "number"
                      ? ` (record: ${issue.record_index})`
                      : ""}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {ordered.length === 0 ? (
        <p className="text-sm text-foreground/60">No tenant exports yet.</p>
      ) : (
        <div className="space-y-3">
          {ordered.map((row) => {
            const detail = details[row.id];
            const manifestUrl =
              detail?.signed_urls["manifest.signed.json"] || detail?.signed_urls["manifest.json"];
            const canRetry = row.status === "failed" || row.status === "expired";
            const isActive = activeExportId === row.id;

            return (
              <div key={row.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {row.export_scope.replaceAll("_", " ")} · {row.format.toUpperCase()}
                    </p>
                    <p className="text-xs text-foreground/60">
                      Created {formatDate(row.created_at)} · Files {row.file_count} ·{" "}
                      {formatBytes(row.total_size_bytes)}
                    </p>
                    <p className="text-xs text-foreground/50">
                      Status: {row.status} · Expires: {formatDate(row.expires_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void loadDetails(row.id);
                      }}
                    >
                      {isActive ? "Reload Detail" : "View Detail"}
                    </Button>
                    {canRetry && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        loading={pendingRetryId === row.id}
                        onClick={() => {
                          void retryExport(row.id);
                        }}
                      >
                        Retry
                      </Button>
                    )}
                    {manifestUrl && (
                      <a
                        href={manifestUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
                      >
                        Download Manifest
                      </a>
                    )}
                  </div>
                </div>

                {row.last_error && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    Last error: {row.last_error}
                  </p>
                )}

                {isActive && detail && (
                  <div className="space-y-2 text-xs text-foreground/70">
                    <p className="font-semibold text-foreground">Recent Jobs</p>
                    {detail.jobs.length === 0 ? (
                      <p>No jobs recorded.</p>
                    ) : (
                      detail.jobs.slice(0, 5).map((job) => (
                        <p key={job.id}>
                          Attempt {job.attempt} · {job.status} · Created {formatDate(job.created_at)}
                          {job.last_error ? ` · ${job.last_error}` : ""}
                        </p>
                      ))
                    )}
                    <p className="font-semibold text-foreground pt-1">Artifacts</p>
                    {detail.files.length === 0 ? (
                      <p>No files recorded.</p>
                    ) : (
                      detail.files.map((file, index) => (
                        <p key={`${file.file_name || "file"}-${index}`}>
                          {file.file_name || "file"} · {formatBytes(Number(file.size_bytes || 0))}
                        </p>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
