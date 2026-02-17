interface AuditLogEntry {
  action: string;
  actor: string;
  resource_type: string;
  resource_id: string;
  details?: Record<string, unknown>;
}

/**
 * Structured audit log entry written to stdout as JSON.
 * In production, these can be captured by log aggregation (e.g. Loki, Datadog).
 */
export function auditLog(entry: AuditLogEntry): void {
  console.log(
    JSON.stringify({
      type: "audit",
      timestamp: new Date().toISOString(),
      ...entry,
    })
  );
}
