"use client";

import Link from "next/link";
import { AlertCircle, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { SimpleMarkdown } from "./simple-markdown";
import type { DocsAiStatus } from "./use-docs-search-ai";

interface AiSource {
  title: string;
  slug: string;
}

interface AiAnswerPanelProps {
  status: Exclude<DocsAiStatus, "idle">;
  answer: string;
  sources: AiSource[];
  error: string | null;
  feedbackSent: boolean;
  onRetry: () => void;
  onFeedback: (helpful: boolean) => void;
  onSourceClick: (slug: string) => void;
}

export function AiAnswerPanel({
  status,
  answer,
  sources,
  error,
  feedbackSent,
  onRetry,
  onFeedback,
  onSourceClick,
}: AiAnswerPanelProps) {
  const loading = status === "loading";
  const streaming = status === "streaming";
  const hasError = status === "error" && Boolean(error);
  const answerReady = status === "ready" || status === "streaming";

  return (
    <div className="px-5 py-4 border-b border-border">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span className="text-[11px] font-semibold tracking-wide uppercase text-accent">
          AI Answer
        </span>
      </div>

      {/* Error state */}
      {hasError && error && (
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-1.5 text-xs text-accent hover:text-accent-light transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 rounded"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading: typing indicator */}
      {loading && (
        <div
          className="flex items-center gap-1.5 py-1"
          role="status"
          aria-live="polite"
          aria-label="Generating AI answer"
        >
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
          <span
            className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      )}

      {/* Answer text */}
      {answerReady && answer && (
        <div
          className="max-h-56 overflow-y-auto pr-1 text-sm text-text-secondary leading-relaxed"
          role="status"
          aria-live="polite"
          aria-atomic="false"
        >
          <SimpleMarkdown text={answer} />
          {/* Streaming cursor */}
          {streaming && (
            <span className="inline-block w-0.5 h-4 bg-accent/60 ml-0.5 align-text-bottom ai-cursor-blink" />
          )}
        </div>
      )}

      {/* Sources row */}
      {sources.length > 0 && status === "ready" && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="text-[11px] text-text-dim mr-0.5">Sources:</span>
          {sources.map((s) => (
            <Link
              key={s.slug}
              href={`/docs/${s.slug}`}
              onClick={(e) => {
                e.preventDefault();
                onSourceClick(s.slug);
              }}
              className="inline-block bg-accent-dim text-accent text-[11px] rounded-md border border-accent/15 px-2 py-0.5 hover:bg-accent/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              {s.title}
            </Link>
          ))}
        </div>
      )}

      {/* Feedback */}
      {status === "ready" && answer && (
        <div className="flex items-center gap-2 mt-3">
          {feedbackSent ? (
            <span className="text-[11px] text-text-dim">Thanks for the feedback!</span>
          ) : (
            <>
              <span className="text-[11px] text-text-dim">Helpful?</span>
              <button
                type="button"
                onClick={() => onFeedback(true)}
                className="text-text-dim hover:text-green-bright transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 rounded"
                aria-label="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback(false)}
                className="text-text-dim hover:text-red-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 rounded"
                aria-label="Not helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
