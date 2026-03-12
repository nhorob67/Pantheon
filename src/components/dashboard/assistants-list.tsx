"use client";

import { useCallback, useState } from "react";
import type { Agent } from "@/types/agent";
import type { SkillConfig } from "@/types/database";
import type { CustomSkill } from "@/types/custom-skill";
import type { ComposioConfig } from "@/types/composio";
import type { CreateAgentData } from "@/lib/validators/agent";
import { AgentCard } from "./agent-card";
import { AgentForm } from "./agent-form";
import { AgentPreviewChat } from "./agent-preview-chat";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Bot } from "lucide-react";

const EMPTY_CUSTOM_SKILLS: CustomSkill[] = [];

interface AssistantsListProps {
  initialAgents: Agent[];
  tenantId: string;
  globalSkillConfigs: SkillConfig[];
  customSkills?: CustomSkill[];
  composioConfig?: ComposioConfig | null;
}

export function AssistantsList({
  initialAgents,
  tenantId,
  globalSkillConfigs,
  customSkills = EMPTY_CUSTOM_SKILLS,
  composioConfig = null,
}: AssistantsListProps) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [formOpen, setFormOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewAgent, setPreviewAgent] = useState<Agent | null>(null);

  const refreshAgents = useCallback(async () => {
    const res = await fetch(`/api/tenants/${tenantId}/agents`);
    if (res.ok) {
      const payload = await res.json();
      const raw = Array.isArray(payload?.data?.agents)
        ? payload.data.agents
        : Array.isArray(payload?.agents)
          ? payload.agents
          : [];
      const nextAgents = raw.map((a: Record<string, unknown>) => ({
        ...a,
        skills: Array.isArray(a.skills) ? a.skills : [],
        composio_toolkits: Array.isArray(a.composio_toolkits) ? a.composio_toolkits : [],
        tool_approval_overrides: a.tool_approval_overrides && typeof a.tool_approval_overrides === "object" && !Array.isArray(a.tool_approval_overrides) ? a.tool_approval_overrides : {},
      }));
      setAgents(nextAgents as Agent[]);
    }
  }, [tenantId]);

  const handleCreate = async (data: CreateAgentData) => {
    const res = await fetch(`/api/tenants/${tenantId}/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const payload = await res.json();
      throw new Error(
        payload?.error?.message || payload?.error || "Failed to create agent"
      );
    }

    await refreshAgents();
  };

  const handleUpdate = async (data: CreateAgentData) => {
    if (!editAgent) return;

    const res = await fetch(
      `/api/tenants/${tenantId}/agents/${editAgent.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!res.ok) {
      const payload = await res.json();
      throw new Error(
        payload?.error?.message || payload?.error || "Failed to update agent"
      );
    }

    await refreshAgents();
  };

  const handleDelete = async () => {
    if (!deleteAgent) return;
    setDeleting(true);

    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/agents/${deleteAgent.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(
          payload?.error?.message || payload?.error || "Failed to delete agent"
        );
      }

      await refreshAgents();
      setDeleteAgent(null);
    } catch {
      // Keep dialog open on error
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (agent: Agent) => {
    await handleCreate({
      display_name: `${agent.display_name} (copy)`,
      role: agent.role || "",
      goal: agent.goal || "",
      backstory: agent.backstory || "",
      autonomy_level: agent.autonomy_level || "copilot",
      discord_channel_id: "",
      discord_channel_name: "",
      is_default: false,
      skills: (agent.skills || []) as CreateAgentData["skills"],
      composio_toolkits: agent.composio_toolkits || [],
      can_delegate: agent.can_delegate ?? false,
      can_receive_delegation: agent.can_receive_delegation ?? false,
      tool_approval_overrides: agent.tool_approval_overrides || {},
    });
  };

  const openEdit = (agent: Agent) => {
    setEditAgent(agent);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditAgent(null);
    setFormOpen(true);
  };

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditAgent(null);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteAgent(null);
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline text-lg text-text-primary">
          Agents
        </h3>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {/* Agent Cards */}
      {agents.length > 0 ? (
        <div className="space-y-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={openEdit}
              onDelete={setDeleteAgent}
              onDuplicate={handleDuplicate}
              onPreview={setPreviewAgent}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-accent-dim flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-accent" />
          </div>
          <h4 className="font-headline text-base text-text-primary mb-1">
            No agents yet
          </h4>
          <p className="text-sm text-text-dim max-w-xs mb-6">
            Create your first agent to get started. Define its role, goal, and personality.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Agent
          </button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AgentForm
        open={formOpen}
        onClose={closeForm}
        onSubmit={editAgent ? handleUpdate : handleCreate}
        editAgent={editAgent}
        globalSkillConfigs={globalSkillConfigs}
        customSkills={customSkills}
        composioConfig={composioConfig}
        tenantId={tenantId}
      />

      {/* Preview Chat Dialog */}
      {previewAgent && (
        <AgentPreviewChat
          agent={previewAgent}
          tenantId={tenantId}
          open={!!previewAgent}
          onClose={() => setPreviewAgent(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteAgent}
        onClose={closeDeleteDialog}
        title="Delete Agent"
      >
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-text-primary">
            {deleteAgent?.display_name}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={closeDeleteDialog}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive/20 hover:bg-destructive/30 text-destructive font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
