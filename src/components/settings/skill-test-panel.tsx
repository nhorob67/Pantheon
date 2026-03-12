"use client";

import { useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SkillTestPanelProps {
  skillId: string;
  skillStatus: "draft" | "active" | "archived";
}

export function SkillTestPanel({ skillId, skillStatus }: SkillTestPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setStreaming(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/custom-skills/${skillId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Test failed");
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      // Add empty assistant message that we'll stream into
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
              accumulated += json.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated };
                return updated;
              });
            }
          } catch {
            // skip
          }
        }
      }

      // Scroll to bottom
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("Test failed. Please try again.");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Status indicator */}
      <div className="px-4 py-2 border-b border-border bg-bg-deep text-xs text-text-dim">
        {skillStatus === "draft" ? "Preview mode — simulated AI response" : "Testing against live instance"}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-dim text-sm">
            Send a message to test your skill
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent/20 text-text-primary"
                  : "bg-bg-card border border-border text-text-secondary"
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              {msg.role === "assistant" && streaming && i === messages.length - 1 && (
                <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-destructive text-xs">{error}</div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a test message..."
            disabled={streaming}
            className="flex-1 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 rounded-lg bg-bg-dark px-4 py-2.5 outline-none transition-colors text-text-primary placeholder:text-text-dim text-sm disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="inline-flex items-center justify-center rounded-lg p-2.5 bg-accent hover:bg-accent-light text-bg-deep transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
