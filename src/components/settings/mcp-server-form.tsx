"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { McpServerConfig } from "@/types/mcp";
import { Loader2 } from "lucide-react";
import { useAsyncFormState } from "@/hooks/use-async-form-state";

interface McpServerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    server_key: string;
    display_name: string;
    command: string;
    args: string[];
    env_vars: Record<string, string>;
    enabled: boolean;
  }) => Promise<void>;
  editServer?: McpServerConfig | null;
}

export function McpServerForm({
  open,
  onClose,
  onSubmit,
  editServer,
}: McpServerFormProps) {
  const [serverKey, setServerKey] = useState(editServer?.server_key || "");
  const [displayName, setDisplayName] = useState(editServer?.display_name || "");
  const [command, setCommand] = useState(editServer?.command || "");
  const [argsStr, setArgsStr] = useState(
    editServer?.args?.join(" ") || ""
  );
  const { saving, error, run, clearError } = useAsyncFormState();

  const resetForm = () => {
    setServerKey(editServer?.server_key || "");
    setDisplayName(editServer?.display_name || "");
    setCommand(editServer?.command || "");
    setArgsStr(editServer?.args?.join(" ") || "");
    clearError();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const args = argsStr
        .trim()
        .split(/\s+/)
        .filter((a) => a.length > 0);

      await onSubmit({
        server_key: serverKey,
        display_name: displayName,
        command,
        args,
        env_vars: {},
        enabled: true,
      });
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        resetForm();
      }}
      title={editServer ? "Edit MCP Server" : "Add MCP Server"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-foreground/60 mb-1.5">
              Key
            </label>
            <input
              value={serverKey}
              onChange={(e) =>
                setServerKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="e.g., filesystem"
              disabled={!!editServer}
              className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground placeholder:text-foreground/30 font-mono text-sm disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm text-foreground/60 mb-1.5">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Filesystem"
              className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground placeholder:text-foreground/30 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-foreground/60 mb-1.5">
            Command
          </label>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g., npx"
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground placeholder:text-foreground/30 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-foreground/60 mb-1.5">
            Arguments
          </label>
          <input
            value={argsStr}
            onChange={(e) => setArgsStr(e.target.value)}
            placeholder="e.g., -y @modelcontextprotocol/server-filesystem /workspace"
            className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground placeholder:text-foreground/30 font-mono text-sm"
          />
          <p className="text-xs text-foreground/30 mt-1">
            Space-separated arguments
          </p>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !serverKey || !command}
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
