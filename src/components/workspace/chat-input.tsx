"use client";

import { useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square } from "lucide-react";
import { useWorkspace, useAgentSession } from "@/hooks/use-workspace";

const MAX_CHARS = 2000;
const WARN_CHARS = 1500;
const MAX_ROWS = 6;

interface ChatInputProps {
  agentId: string;
  agentName: string;
  streaming: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
}

export function ChatInput({ agentId, agentName, streaming, onSend, onStop }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const setDraft = useWorkspace((s) => s.setDraft);
  const session = useAgentSession(agentId);
  const draft = session.draft;

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20;
    const maxHeight = lineHeight * MAX_ROWS + 24; // padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [draft, resize]);

  // Focus textarea when agent changes
  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [agentId]);

  const handleSubmit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed);
    setDraft(agentId, "");
  }, [draft, streaming, onSend, setDraft, agentId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const canSend = draft.trim().length > 0 && draft.length <= MAX_CHARS;
  const showCounter = draft.length > WARN_CHARS;
  const overLimit = draft.length > MAX_CHARS;

  return (
    <div className="px-4 pb-4">
      <div className="bg-bg-dark border border-border rounded-xl p-3 relative">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(agentId, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${agentName}...`}
          rows={1}
          disabled={streaming}
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-dim resize-none outline-none pr-12 leading-5 disabled:opacity-50"
          aria-label={`Message ${agentName}`}
        />
        {showCounter && (
          <span
            className={`absolute bottom-1 right-14 text-[11px] font-mono ${
              overLimit ? "text-error" : "text-text-dim"
            }`}
          >
            {draft.length}/{MAX_CHARS}
          </span>
        )}
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-bg-surface flex items-center justify-center text-text-dim hover:text-error transition-colors cursor-pointer"
            aria-label="Stop generating"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              canSend
                ? "bg-accent text-bg-deep hover:shadow-[0_0_16px_rgba(196,136,63,0.2)]"
                : "bg-bg-surface text-text-dim"
            }`}
            aria-label="Send message"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
