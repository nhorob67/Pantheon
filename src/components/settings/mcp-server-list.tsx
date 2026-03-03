"use client";

import { useState } from "react";
import type { McpServerConfig } from "@/types/mcp";
import { McpServerCard } from "./mcp-server-card";
import { McpServerForm } from "./mcp-server-form";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Server } from "lucide-react";

interface McpServerListProps {
  initialServers: McpServerConfig[];
  tenantId: string;
}

export function McpServerList({
  initialServers,
  tenantId,
}: McpServerListProps) {
  const [servers, setServers] = useState<McpServerConfig[]>(initialServers);
  const [formOpen, setFormOpen] = useState(false);
  const [editServer, setEditServer] = useState<McpServerConfig | null>(null);
  const [deleteServer, setDeleteServer] = useState<McpServerConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshServers = async () => {
    const res = await fetch(`/api/tenants/${tenantId}/mcp-servers`);
    if (res.ok) {
      const data = await res.json();
      setServers(data?.data?.mcp_servers ?? data?.mcp_servers);
    }
  };

  const handleCreate = async (data: {
    server_key: string;
    display_name: string;
    command: string;
    args: string[];
    env_vars: Record<string, string>;
    enabled: boolean;
  }) => {
    const res = await fetch(`/api/tenants/${tenantId}/mcp-servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = typeof err?.error === "object" ? err.error?.message : err?.error;
      throw new Error(msg || "Failed to create MCP server");
    }

    await refreshServers();
  };

  const handleUpdate = async (data: {
    server_key: string;
    display_name: string;
    command: string;
    args: string[];
    env_vars: Record<string, string>;
    enabled: boolean;
  }) => {
    if (!editServer) return;

    const res = await fetch(
      `/api/tenants/${tenantId}/mcp-servers/${editServer.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      const msg = typeof err?.error === "object" ? err.error?.message : err?.error;
      throw new Error(msg || "Failed to update MCP server");
    }

    await refreshServers();
  };

  const handleToggle = async (server: McpServerConfig, enabled: boolean) => {
    const res = await fetch(
      `/api/tenants/${tenantId}/mcp-servers/${server.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      }
    );

    if (res.ok) {
      await refreshServers();
    }
  };

  const handleDelete = async () => {
    if (!deleteServer) return;
    setDeleting(true);

    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/mcp-servers/${deleteServer.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const err = await res.json();
        const msg = typeof err?.error === "object" ? err.error?.message : err?.error;
        throw new Error(msg || "Failed to delete MCP server");
      }

      await refreshServers();
      setDeleteServer(null);
    } catch {
      // Keep dialog open on error
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => {
            setEditServer(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add MCP Server
        </button>
      </div>

      {servers.length > 0 ? (
        <div className="space-y-3">
          {servers.map((server) => (
            <McpServerCard
              key={server.id}
              server={server}
              onEdit={(s) => {
                setEditServer(s);
                setFormOpen(true);
              }}
              onDelete={setDeleteServer}
              onToggle={handleToggle}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Server className="w-8 h-8 text-foreground/40" />
          </div>
          <h4 className="font-headline text-base font-semibold text-foreground mb-1">
            No MCP servers configured
          </h4>
          <p className="text-sm text-foreground/50 max-w-xs mb-4">
            Add an MCP server to give your assistant access to additional
            tools beyond the built-in farm tools.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditServer(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add MCP Server
          </button>
        </div>
      )}

      <McpServerForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditServer(null);
        }}
        onSubmit={editServer ? handleUpdate : handleCreate}
        editServer={editServer}
      />

      <Dialog
        open={!!deleteServer}
        onClose={() => setDeleteServer(null)}
        title="Delete MCP Server"
      >
        <p className="text-sm text-foreground/60 mb-6">
          Are you sure you want to remove{" "}
          <span className="font-semibold text-foreground">
            {deleteServer?.display_name}
          </span>
          ? Your assistant will lose access to this tool server.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setDeleteServer(null)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
