"use client";

import { useState, useCallback } from "react";
import { Copy, RefreshCw, Check } from "lucide-react";
import { SimpleMarkdown } from "@/components/docs/simple-markdown";
import { AgentAvatar } from "./agent-panel-item";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  agentKey?: string;
  agentName?: string;
  isFirstInGroup: boolean;
  isStreaming?: boolean;
  isLastUserMessage?: boolean;
  onRetry?: () => void;
  isError?: boolean;
}

export function ChatMessage({
  role,
  content,
  agentKey,
  agentName,
  isFirstInGroup,
  isStreaming = false,
  isLastUserMessage = false,
  onRetry,
  isError = false,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [content]);

  if (role === "user") {
    return (
      <div
        className={`flex justify-end ${isFirstInGroup ? "mt-4" : "mt-1"}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative max-w-[75%] group">
          {/* Hover actions */}
          {hovered && !isStreaming && content && (
            <div className="absolute -top-8 right-0 flex items-center gap-1 bg-bg-elevated border border-border rounded-lg px-1.5 py-1 shadow-sm z-10">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-text-dim hover:text-text-secondary transition-colors"
                aria-label="Copy message"
              >
                {copied ? <Check className="w-3 h-3 text-green-bright" /> : <Copy className="w-3 h-3" />}
              </button>
              {isLastUserMessage && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="p-1 text-text-dim hover:text-text-secondary transition-colors"
                  aria-label="Retry"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <div className="bg-accent/12 rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-text-primary leading-relaxed">
            <SimpleMarkdown text={content} />
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div
      className={`flex justify-start gap-2.5 ${isFirstInGroup ? "mt-4" : "mt-1"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isFirstInGroup && agentKey && agentName ? (
        <div className="shrink-0 mt-0.5">
          <AgentAvatar agentKey={agentKey} displayName={agentName} size={32} />
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}
      <div className="relative max-w-[75%] group">
        {/* Hover actions */}
        {hovered && !isStreaming && content && (
          <div className="absolute -top-8 left-0 flex items-center gap-1 bg-bg-elevated border border-border rounded-lg px-1.5 py-1 shadow-sm z-10">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-text-dim hover:text-text-secondary transition-colors"
              aria-label="Copy message"
            >
              {copied ? <Check className="w-3 h-3 text-green-bright" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
        <div
          className={`rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-[1.7] ${
            isError
              ? "bg-error/8 border border-error/20 text-error"
              : "bg-white/[0.04] text-text-secondary"
          }`}
        >
          {content ? (
            <>
              <SimpleMarkdown text={content} />
              {isStreaming && (
                <span
                  className="inline-block w-[2px] h-4 ml-0.5 align-middle bg-accent/60"
                  style={{ animation: "workspace-cursor-pulse 1s ease-in-out infinite" }}
                />
              )}
            </>
          ) : isStreaming ? (
            <TypingIndicator />
          ) : null}
          {isError && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 mt-2 text-sm text-accent hover:text-accent-light transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1 px-1" aria-label="Agent is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-text-dim"
          style={{
            animation: "workspace-dot-bounce 1.4s ease-in-out infinite",
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}
