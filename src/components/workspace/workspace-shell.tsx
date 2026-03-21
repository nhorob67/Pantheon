"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Agent } from "@/types/agent";
import type { CustomSkill } from "@/types/custom-skill";
import type { SkillConfig } from "@/types/database";
import type { ComposioConfig } from "@/types/composio";
import {
  useWorkspace,
  useSelectedAgentId,
} from "@/hooks/use-workspace";
import { AgentPanel } from "./agent-panel";
import { ChatPanel } from "./chat-panel";
import { InspectorPanel } from "./inspector-panel";

interface KnowledgeFile {
  id: string;
  file_name: string;
  file_type: string;
  agent_id: string | null;
}

interface WorkspaceShellProps {
  agents: Agent[];
  tenantId: string;
  customSkills: CustomSkill[];
  skillConfigs: SkillConfig[];
  composioConfig: ComposioConfig | null;
  knowledgeFiles: KnowledgeFile[];
}

export function WorkspaceShell({
  agents,
  tenantId,
  customSkills,
  skillConfigs,
  composioConfig,
  knowledgeFiles,
}: WorkspaceShellProps) {
  const selectedAgentId = useSelectedAgentId();
  const selectAgent = useWorkspace((s) => s.selectAgent);
  const router = useRouter();

  // Auto-select first agent if none selected
  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      selectAgent(agents[0].id);
    }
  }, [selectedAgentId, agents, selectAgent]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  const handleAgentUpdated = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: Agent Panel — hidden on mobile */}
      <div className="hidden xl:block">
        <AgentPanel agents={agents} />
      </div>

      {/* Center: Chat Panel */}
      {selectedAgent ? (
        <ChatPanel agent={selectedAgent} tenantId={tenantId} />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-bg-deep">
          <div className="text-center">
            <p className="text-text-dim text-sm">
              {agents.length === 0
                ? "Create your first agent to get started"
                : "Select an agent to start chatting"}
            </p>
          </div>
        </div>
      )}

      {/* Right: Inspector Panel — hidden on tablet and below */}
      {selectedAgent && (
        <div className="hidden xl:block">
          <InspectorPanel
            agent={selectedAgent}
            tenantId={tenantId}
            customSkills={customSkills}
            skillConfigs={skillConfigs}
            composioConfig={composioConfig}
            knowledgeFiles={knowledgeFiles}
            onAgentUpdated={handleAgentUpdated}
          />
        </div>
      )}

      {/* Mobile agent switcher — visible below xl */}
      {agents.length > 1 && (
        <div className="xl:hidden fixed bottom-20 left-4 z-30">
          <select
            value={selectedAgentId || ""}
            onChange={(e) => selectAgent(e.target.value)}
            className="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary shadow-md"
            aria-label="Select agent"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.display_name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
