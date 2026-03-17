"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { McpServerConfig } from "@/types/mcp";
import { Loader2, Plus, X } from "lucide-react";
import { useAsyncFormState } from "@/hooks/use-async-form-state";

export interface McpServerFormData {
  server_key: string;
  display_name: string;
  transport: "stdio" | "sse";
  command: string;
  args: string[];
  env_vars: Record<string, string>;
  url: string | null;
  headers: Record<string, string>;
  scope: "instance" | "agent";
  agent_id: string | null;
  enabled: boolean;
}

interface McpServerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: McpServerFormData) => Promise<void>;
  editServer?: McpServerConfig | null;
  agents?: { id: string; name: string }[];
}

function KeyValueEditor({
  entries,
  onChange,
  label,
  emptyText,
  keyPlaceholder,
  inputClassName,
}: {
  entries: { key: string; value: string }[];
  onChange: (entries: { key: string; value: string }[]) => void;
  label: string;
  emptyText: string;
  keyPlaceholder: string;
  inputClassName: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-foreground/60">{label}</label>
        <button
          type="button"
          onClick={() => onChange([...entries, { key: "", value: "" }])}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>
      {entries.length === 0 && (
        <p className="text-xs text-foreground/30">{emptyText}</p>
      )}
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={entry.key}
              onChange={(e) => {
                const next = [...entries];
                next[i] = { ...entry, key: e.target.value };
                onChange(next);
              }}
              placeholder={keyPlaceholder}
              className={`${inputClassName} flex-1`}
            />
            <input
              value={entry.value}
              onChange={(e) => {
                const next = [...entries];
                next[i] = { ...entry, value: e.target.value };
                onChange(next);
              }}
              placeholder="value"
              type="password"
              className={`${inputClassName} flex-1`}
            />
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, j) => j !== i))}
              className="p-2 text-foreground/40 hover:text-destructive transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function McpServerForm({
  open,
  onClose,
  onSubmit,
  editServer,
  agents = [],
}: McpServerFormProps) {
  const [serverKey, setServerKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [transport, setTransport] = useState<"stdio" | "sse">("stdio");
  const [command, setCommand] = useState("");
  const [argsStr, setArgsStr] = useState("");
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [url, setUrl] = useState("");
  const [headerEntries, setHeaderEntries] = useState<{ key: string; value: string }[]>([]);
  const [scope, setScope] = useState<"instance" | "agent">("instance");
  const [agentId, setAgentId] = useState<string>("");
  const { saving, error, run, clearError } = useAsyncFormState();

  // The form state is reset from the modal inputs each time it opens.
  // This is intentional initialization rather than reactive synchronization.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setServerKey(editServer?.server_key || "");
      setDisplayName(editServer?.display_name || "");
      setTransport(editServer?.transport || "stdio");
      setCommand(editServer?.command || "");
      setArgsStr(editServer?.args?.join(" ") || "");
      setUrl(editServer?.url || "");
      setScope(editServer?.scope || "instance");
      setAgentId(editServer?.agent_id || "");
      clearError();

      const envObj = editServer?.env_vars || {};
      setEnvVars(
        Object.keys(envObj).length > 0
          ? Object.entries(envObj).map(([key, value]) => ({ key, value }))
          : []
      );

      const headerObj = editServer?.headers || {};
      setHeaderEntries(
        Object.keys(headerObj).length > 0
          ? Object.entries(headerObj).map(([key, value]) => ({ key, value }))
          : []
      );
    }
  }, [open, editServer]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const args = argsStr
        .trim()
        .split(/\s+/)
        .filter((a) => a.length > 0);

      const envVarsObj: Record<string, string> = {};
      for (const { key, value } of envVars) {
        if (key.trim()) envVarsObj[key.trim()] = value;
      }

      const headersObj: Record<string, string> = {};
      for (const { key, value } of headerEntries) {
        if (key.trim()) headersObj[key.trim()] = value;
      }

      await onSubmit({
        server_key: serverKey,
        display_name: displayName,
        transport,
        command: transport === "stdio" ? command : "",
        args: transport === "stdio" ? args : [],
        env_vars: transport === "stdio" ? envVarsObj : {},
        url: transport === "sse" ? url : null,
        headers: transport === "sse" ? headersObj : {},
        scope,
        agent_id: scope === "agent" ? agentId || null : null,
        enabled: editServer?.enabled ?? true,
      });
      onClose();
    });
  };

  const isValid =
    serverKey &&
    displayName &&
    (transport === "stdio" ? command : url);

  const inputClass =
    "w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground placeholder:text-foreground/30 text-sm";
  const monoInputClass = `${inputClass} font-mono`;
  const labelClass = "block text-sm text-foreground/60 mb-1.5";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editServer ? "Edit MCP Server" : "Add MCP Server"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Key + Display Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Key</label>
            <input
              value={serverKey}
              onChange={(e) =>
                setServerKey(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                )
              }
              placeholder="e.g., filesystem"
              disabled={!!editServer}
              className={`${monoInputClass} disabled:opacity-50`}
            />
          </div>
          <div>
            <label className={labelClass}>Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Filesystem"
              className={inputClass}
            />
          </div>
        </div>

        {/* Transport selector */}
        <div>
          <label className={labelClass}>Transport</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTransport("stdio")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                transport === "stdio"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/60 hover:text-foreground"
              }`}
            >
              stdio (local process)
            </button>
            <button
              type="button"
              onClick={() => setTransport("sse")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                transport === "sse"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/60 hover:text-foreground"
              }`}
            >
              SSE (remote HTTP)
            </button>
          </div>
        </div>

        {/* stdio fields */}
        {transport === "stdio" && (
          <>
            <div>
              <label className={labelClass}>Command</label>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g., npx"
                className={monoInputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Arguments</label>
              <input
                value={argsStr}
                onChange={(e) => setArgsStr(e.target.value)}
                placeholder="e.g., -y @modelcontextprotocol/server-filesystem /workspace"
                className={monoInputClass}
              />
              <p className="text-xs text-foreground/30 mt-1">
                Space-separated arguments
              </p>
            </div>

            {/* Environment variables */}
            <KeyValueEditor
              entries={envVars}
              onChange={setEnvVars}
              label="Environment Variables"
              emptyText="No environment variables configured."
              keyPlaceholder="KEY"
              inputClassName={monoInputClass}
            />
          </>
        )}

        {/* SSE fields */}
        {transport === "sse" && (
          <>
            <div>
              <label className={labelClass}>Server URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mcp.example.com/sse"
                className={monoInputClass}
              />
              <p className="text-xs text-foreground/30 mt-1">
                The SSE endpoint URL for the remote MCP server
              </p>
            </div>

            {/* Headers */}
            <KeyValueEditor
              entries={headerEntries}
              onChange={setHeaderEntries}
              label="Headers"
              emptyText="No custom headers configured."
              keyPlaceholder="Header-Name"
              inputClassName={monoInputClass}
            />
          </>
        )}

        {/* Scope */}
        <div>
          <label className={labelClass}>Scope</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setScope("instance");
                setAgentId("");
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                scope === "instance"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/60 hover:text-foreground"
              }`}
            >
              All agents
            </button>
            <button
              type="button"
              onClick={() => setScope("agent")}
              disabled={agents.length === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                scope === "agent"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/60 hover:text-foreground"
              }`}
            >
              Specific agent
            </button>
          </div>
          {scope === "agent" && agents.length > 0 && (
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className={`${inputClass} mt-2`}
            >
              <option value="">Select an agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !isValid}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editServer ? "Save Changes" : "Add Server"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
