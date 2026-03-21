"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export interface WorkspaceChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentChatSession {
  messages: WorkspaceChatMessage[];
  draft: string;
}

interface WorkspaceState {
  selectedAgentId: string | null;
  inspectorOpen: boolean;
  chatSessions: Record<string, AgentChatSession>;
  streamingAgentId: string | null;
  activeInspectorSection: string | null;

  selectAgent: (id: string) => void;
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  setDraft: (agentId: string, value: string) => void;
  addMessage: (agentId: string, msg: WorkspaceChatMessage) => void;
  updateLastMessage: (agentId: string, content: string) => void;
  clearChat: (agentId: string) => void;
  setStreaming: (agentId: string | null) => void;
  setActiveInspectorSection: (section: string | null) => void;
}

function ensureSession(sessions: Record<string, AgentChatSession>, agentId: string): AgentChatSession {
  return sessions[agentId] || { messages: [], draft: "" };
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      selectedAgentId: null,
      inspectorOpen: true,
      chatSessions: {},
      streamingAgentId: null,
      activeInspectorSection: "identity",

      selectAgent: (id) => set({ selectedAgentId: id }),

      toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
      setInspectorOpen: (open) => set({ inspectorOpen: open }),

      setDraft: (agentId, value) =>
        set((s) => ({
          chatSessions: {
            ...s.chatSessions,
            [agentId]: { ...ensureSession(s.chatSessions, agentId), draft: value },
          },
        })),

      addMessage: (agentId, msg) =>
        set((s) => {
          const session = ensureSession(s.chatSessions, agentId);
          return {
            chatSessions: {
              ...s.chatSessions,
              [agentId]: { ...session, messages: [...session.messages, msg] },
            },
          };
        }),

      updateLastMessage: (agentId, content) =>
        set((s) => {
          const session = ensureSession(s.chatSessions, agentId);
          const msgs = [...session.messages];
          if (msgs.length > 0) {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
          }
          return {
            chatSessions: {
              ...s.chatSessions,
              [agentId]: { ...session, messages: msgs },
            },
          };
        }),

      clearChat: (agentId) =>
        set((s) => ({
          chatSessions: {
            ...s.chatSessions,
            [agentId]: { messages: [], draft: ensureSession(s.chatSessions, agentId).draft },
          },
        })),

      setStreaming: (agentId) => set({ streamingAgentId: agentId }),
      setActiveInspectorSection: (section) => set({ activeInspectorSection: section }),
    }),
    {
      name: "pantheon-workspace-v1",
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize: (state) => ({
        selectedAgentId: state.selectedAgentId,
        inspectorOpen: state.inspectorOpen,
        chatSessions: state.chatSessions,
        activeInspectorSection: state.activeInspectorSection,
        // streamingAgentId excluded — transient state
      }),
    }
  )
);

// Granular selectors
export const useSelectedAgentId = () => useWorkspace((s) => s.selectedAgentId);
export const useInspectorOpen = () => useWorkspace((s) => s.inspectorOpen);
export const useStreamingAgentId = () => useWorkspace((s) => s.streamingAgentId);
export const useActiveInspectorSection = () => useWorkspace((s) => s.activeInspectorSection);

const EMPTY_SESSION: AgentChatSession = { messages: [], draft: "" };

export function useAgentSession(agentId: string | null) {
  return useWorkspace(
    useShallow((s) =>
      agentId ? s.chatSessions[agentId] || EMPTY_SESSION : EMPTY_SESSION
    )
  );
}
