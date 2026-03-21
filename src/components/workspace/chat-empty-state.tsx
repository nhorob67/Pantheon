"use client";

import type { Agent } from "@/types/agent";
import { AgentAvatar } from "./agent-panel-item";

function generateStarterPrompts(agent: Agent): string[] {
  const prompts: string[] = [];

  if (agent.role) {
    prompts.push("What can you help with?");
  }
  if (agent.goal) {
    prompts.push("Walk me through a common task");
  }
  if (agent.skills.length > 0) {
    prompts.push("What tools do you have access to?");
  }

  // Fallback prompts
  if (prompts.length === 0) {
    prompts.push("Introduce yourself", "What can you do?", "Help me get started");
  } else if (prompts.length < 3) {
    prompts.push("Help me get started");
  }

  return prompts.slice(0, 3);
}

interface ChatEmptyStateProps {
  agent: Agent;
  onSendPrompt: (prompt: string) => void;
}

export function ChatEmptyState({ agent, onSendPrompt }: ChatEmptyStateProps) {
  const prompts = generateStarterPrompts(agent);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AgentAvatar
            agentKey={agent.agent_key}
            displayName={agent.display_name}
            size={56}
          />
        </div>
        <h3 className="font-headline text-xl font-semibold text-text-primary">
          {agent.display_name}
        </h3>
        <p className="text-sm text-text-dim mt-1">{agent.role}</p>
        {agent.goal && (
          <p className="text-sm text-text-secondary mt-2 max-w-md text-center italic">
            {agent.goal}
          </p>
        )}

        <div className="w-12 h-px bg-border mx-auto my-6" />

        <div className="flex flex-wrap justify-center gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSendPrompt(prompt)}
              className="bg-bg-card border border-border rounded-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
