"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Trash2, PanelRightOpen, PanelRightClose, ChevronDown } from "lucide-react";
import type { Agent } from "@/types/agent";
import { AUTONOMY_LEVEL_INFO } from "@/types/agent";
import {
  useWorkspace,
  useAgentSession,
  useStreamingAgentId,
  useInspectorOpen,
  type WorkspaceChatMessage,
} from "@/hooks/use-workspace";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ChatEmptyState } from "./chat-empty-state";

interface ChatPanelProps {
  agent: Agent;
  tenantId: string;
}

export function ChatPanel({ agent, tenantId }: ChatPanelProps) {
  const session = useAgentSession(agent.id);
  const streamingAgentId = useStreamingAgentId();
  const inspectorOpen = useInspectorOpen();
  const addMessage = useWorkspace((s) => s.addMessage);
  const updateLastMessage = useWorkspace((s) => s.updateLastMessage);
  const clearChat = useWorkspace((s) => s.clearChat);
  const setStreaming = useWorkspace((s) => s.setStreaming);
  const setDraft = useWorkspace((s) => s.setDraft);
  const toggleInspector = useWorkspace((s) => s.toggleInspector);

  const isStreaming = streamingAgentId === agent.id;
  const [error, setError] = useState<string | null>(null);

  // Streaming refs
  const abortRef = useRef<AbortController | null>(null);
  const streamingContentRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Clean up rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // Auto-scroll logic
  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Track scroll position for jump-to-latest
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const farFromBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 200;
      stickToBottomRef.current = !farFromBottom;
      setShowJumpToLatest(farFromBottom);
    };
    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll on new messages while user is still anchored near bottom
  useEffect(() => {
    if (stickToBottomRef.current || isNearBottom()) {
      scrollToBottom();
    }
  }, [session.messages, isNearBottom, scrollToBottom]);

  const removeTrailingEmptyAssistant = useCallback((agentId: string) => {
    const state = useWorkspace.getState();
    const sessionState = state.chatSessions[agentId];
    if (!sessionState || sessionState.messages.length === 0) return;

    const nextMessages = [...sessionState.messages];
    const last = nextMessages[nextMessages.length - 1];
    if (last.role === "assistant" && !last.content) {
      nextMessages.pop();
      useWorkspace.setState({
        chatSessions: {
          ...state.chatSessions,
          [agentId]: { ...sessionState, messages: nextMessages },
        },
      });
    }
  }, []);

  const handleSend = useCallback(
    async (message: string) => {
      setError(null);
      stickToBottomRef.current = true;
      setShowJumpToLatest(false);
      addMessage(agent.id, { role: "user", content: message });
      addMessage(agent.id, { role: "assistant", content: "" });
      setStreaming(agent.id);

      const controller = new AbortController();
      abortRef.current = controller;
      streamingContentRef.current = "";

      try {
        // Build message history for context
        const currentMessages = useWorkspace.getState().chatSessions[agent.id]?.messages || [];
        const historyForApi: WorkspaceChatMessage[] = [
          ...currentMessages
            .slice(0, -1) // exclude the empty assistant message we just added
            .filter((m) => m.content), // skip empty messages
        ];

        const res = await fetch(
          `/api/tenants/${tenantId}/agents/${agent.id}/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: historyForApi }),
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || `Request failed (${res.status})`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const flushToState = () => {
          const content = streamingContentRef.current;
          updateLastMessage(agent.id, content);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              if (json.error) {
                throw new Error(json.error);
              }
              if (json.content) {
                streamingContentRef.current += json.content;
                if (rafIdRef.current === null) {
                  rafIdRef.current = requestAnimationFrame(() => {
                    rafIdRef.current = null;
                    flushToState();
                  });
                }
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message !== "Stream error") {
                // skip unparseable lines
              } else {
                throw parseErr;
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User cancelled — mark message as interrupted
          if (streamingContentRef.current) {
            updateLastMessage(agent.id, streamingContentRef.current);
          } else {
            removeTrailingEmptyAssistant(agent.id);
          }
        } else {
          const errorMsg = err instanceof Error ? err.message : "Something went wrong";
          setError(errorMsg);
          updateLastMessage(agent.id, errorMsg);
        }
      } finally {
        if (useWorkspace.getState().streamingAgentId === agent.id) {
          setStreaming(null);
        }
        abortRef.current = null;
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        // Final flush
        if (streamingContentRef.current) {
          updateLastMessage(agent.id, streamingContentRef.current);
        }
      }
    },
    [agent.id, tenantId, addMessage, updateLastMessage, setStreaming, removeTrailingEmptyAssistant]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleRetry = useCallback(() => {
    // Find the last user message and resend it
    const msgs = session.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        // Remove the failed assistant response and retry
        const state = useWorkspace.getState();
        const agentSession = state.chatSessions[agent.id];
        if (agentSession) {
          // Remove messages from the last user message onwards
          const trimmed = agentSession.messages.slice(0, i);
          useWorkspace.setState({
            chatSessions: {
              ...state.chatSessions,
              [agent.id]: { ...agentSession, messages: trimmed },
            },
          });
        }
        setError(null);
        handleSend(msgs[i].content);
        break;
      }
    }
  }, [session.messages, agent.id, handleSend]);

  const handleClearChat = useCallback(() => {
    clearChat(agent.id);
    setError(null);
  }, [agent.id, clearChat]);

  const handleSendPrompt = useCallback(
    (prompt: string) => {
      setDraft(agent.id, "");
      handleSend(prompt);
    },
    [agent.id, setDraft, handleSend]
  );

  const messages = session.messages;
  const autonomyInfo = AUTONOMY_LEVEL_INFO[agent.autonomy_level];

  // Group messages
  const isFirstInGroup = (index: number) => {
    if (index === 0) return true;
    return messages[index].role !== messages[index - 1].role;
  };

  // Find last user message index
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIndex = i;
      break;
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-bg-deep">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="font-headline text-base font-semibold text-text-primary truncate">
              {agent.display_name}
            </h2>
            <p className="text-xs text-text-dim tracking-wide truncate">{agent.role}</p>
          </div>
          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-text-dim">
            {autonomyInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 text-text-dim hover:text-text-secondary transition-colors rounded-lg hover:bg-bg-surface"
              aria-label="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleInspector}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-dim transition-colors hover:bg-bg-surface hover:text-text-secondary xl:hidden"
            aria-label={inspectorOpen ? "Hide agent details" : "Show agent details"}
          >
            {inspectorOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
            <span>{inspectorOpen ? "Hide details" : "Agent details"}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <ChatEmptyState agent={agent} onSendPrompt={handleSendPrompt} />
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 min-h-0 relative"
          role="log"
          aria-live="polite"
          style={{ overflowAnchor: "auto" }}
        >
          <div className="max-w-3xl mx-auto py-4">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                agentKey={agent.agent_key}
                agentName={agent.display_name}
                isFirstInGroup={isFirstInGroup(i)}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                isLastUserMessage={i === lastUserIndex}
                onRetry={handleRetry}
                isError={!isStreaming && i === messages.length - 1 && msg.role === "assistant" && !!error}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Jump to latest */}
          {showJumpToLatest && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 bg-bg-card/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-xs text-text-secondary flex items-center gap-1.5 shadow-sm hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Jump to latest message"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Jump to latest
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <ChatInput
        agentId={agent.id}
        agentName={agent.display_name}
        streaming={isStreaming}
        onSend={handleSend}
        onStop={handleStop}
      />
    </div>
  );
}
