"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Agent } from "@/types/agent";
import { Dialog } from "@/components/ui/dialog";
import { Loader2, Send, Trash2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentPreviewChatProps {
  agent: Agent;
  tenantId: string;
  open: boolean;
  onClose: () => void;
}

export function AgentPreviewChat({
  agent,
  tenantId,
  open,
  onClose,
}: AgentPreviewChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingContentRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Cancel any pending rAF on unmount to avoid stale setState calls
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    setInput("");
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/agents/${agent.id}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        }
      );

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Request failed (${res.status})`);
      }

      // Read the data stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      streamingContentRef.current = "";
      let buffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const flushToState = () => {
        const content = streamingContentRef.current;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content,
          };
          return updated;
        });
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
            if (json.content) {
              streamingContentRef.current += json.content;

              if (rafIdRef.current === null) {
                rafIdRef.current = requestAnimationFrame(() => {
                  rafIdRef.current = null;
                  flushToState();
                });
              }
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStreaming(false);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Final flush to ensure all content is rendered
      if (streamingContentRef.current) {
        const finalContent = streamingContentRef.current;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: finalContent,
          };
          return updated;
        });
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Test — ${agent.display_name}`}
      size="lg"
    >
      <div className="flex flex-col h-[60vh] max-h-[500px]">
        {/* Preview banner */}
        <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mb-3 text-xs text-accent">
          Preview Mode — responses won&apos;t appear in Discord
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
          {messages.length === 0 && (
            <p className="text-sm text-text-dim text-center py-8">
              Send a message to test this assistant. Try &ldquo;What&apos;s corn at?&rdquo;
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-accent/20 text-text-primary"
                    : "bg-white/5 text-text-primary"
                }`}
              >
                {msg.content || (streaming && i === messages.length - 1 ? (
                  <Loader2 className="w-4 h-4 animate-spin text-text-dim" />
                ) : null)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <p className="text-destructive text-xs mb-2">{error}</p>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows={1}
            placeholder="Type a message..."
            disabled={streaming}
            className="flex-1 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-3 py-2.5 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm resize-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="bg-accent hover:bg-accent-light text-bg-deep rounded-lg px-3 py-2.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="text-text-dim hover:text-text-secondary rounded-lg px-2 py-2.5 transition-colors cursor-pointer"
              title="Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </Dialog>
  );
}
