"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { MCP_PRESET_KEYS, MCP_PRESET_INFO } from "@/types/mcp";
import type { McpPresetKey, McpServerConfig } from "@/types/mcp";
import { Loader2, Package, Wrench } from "lucide-react";

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
  const [mode, setMode] = useState<"preset" | "custom">(
    editServer ? "custom" : "preset"
  );
  const [selectedPreset, setSelectedPreset] = useState<McpPresetKey | null>(null);
  const [serverKey, setServerKey] = useState(editServer?.server_key || "");
  const [displayName, setDisplayName] = useState(editServer?.display_name || "");
  const [command, setCommand] = useState(editServer?.command || "");
  const [argsStr, setArgsStr] = useState(
    editServer?.args?.join(" ") || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setMode(editServer ? "custom" : "preset");
    setSelectedPreset(null);
    setServerKey(editServer?.server_key || "");
    setDisplayName(editServer?.display_name || "");
    setCommand(editServer?.command || "");
    setArgsStr(editServer?.args?.join(" ") || "");
    setError(null);
  };

  const handlePresetSelect = (key: McpPresetKey) => {
    setSelectedPreset(key);
    const preset = MCP_PRESET_INFO[key];
    setServerKey(key);
    setDisplayName(preset.label);
    setCommand(preset.command);
    setArgsStr(preset.args.join(" "));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
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
        {/* Mode selector (only for create) */}
        {!editServer && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("preset")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                mode === "preset"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted text-foreground/60 border border-transparent hover:text-foreground"
              }`}
            >
              <Package className="w-4 h-4" />
              From Preset
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                mode === "custom"
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted text-foreground/60 border border-transparent hover:text-foreground"
              }`}
            >
              <Wrench className="w-4 h-4" />
              Custom
            </button>
          </div>
        )}

        {/* Preset selector */}
        {mode === "preset" && !editServer && (
          <div className="space-y-2">
            {MCP_PRESET_KEYS.map((key) => {
              const preset = MCP_PRESET_INFO[key];
              const selected = selectedPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetSelect(key)}
                  className={`w-full text-left rounded-lg border p-4 transition-all cursor-pointer ${
                    selected
                      ? "border-primary/50 ring-2 ring-primary/20 bg-primary/5"
                      : "border-border hover:border-foreground/20 hover:bg-muted"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">
                    {preset.label}
                  </p>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    {preset.description}
                  </p>
                  <p className="text-xs font-mono text-foreground/30 mt-1.5">
                    {preset.command} {preset.args.join(" ")}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Custom / detail fields */}
        {(mode === "custom" || selectedPreset || editServer) && (
          <>
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
                placeholder="e.g., -y @modelcontextprotocol/server-filesystem /home/node/workspace"
                className="w-full border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-4 py-3 outline-none transition-colors text-foreground placeholder:text-foreground/30 font-mono text-sm"
              />
              <p className="text-xs text-foreground/30 mt-1">
                Space-separated arguments
              </p>
            </div>
          </>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

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
