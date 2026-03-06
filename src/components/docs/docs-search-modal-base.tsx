"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Search, FileText, Hash, ArrowRight, Sparkles } from "lucide-react";
import { AiAnswerPanel } from "./ai-answer-panel";
import { useDocsSearchAi, type DocsAiStatus, type SearchResult } from "./use-docs-search-ai";
import { useModalA11y } from "./use-modal-a11y";

export type { SearchResult };

export interface DocsSearchModalBaseProps {
  canAskAi: boolean;
  authChecked: boolean;
  feedbackSurface: "docs_modal" | "dashboard_help_modal";
  onClose: () => void;
  onNavigate: (result: SearchResult) => void;
  onNavigateToSlug: (slug: string) => void;
  a11yTitleId: string;
  a11yDescId: string;
  title: string;
  description: string;
  placeholder: string;
  inputId: string;
  renderSignInPrompt?: () => ReactNode;
}

export function DocsSearchModalBase({
  canAskAi,
  authChecked,
  feedbackSurface,
  onClose,
  onNavigate,
  onNavigateToSlug,
  a11yTitleId,
  a11yDescId,
  title,
  description,
  placeholder,
  inputId,
  renderSignInPrompt,
}: DocsSearchModalBaseProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const {
    query,
    loaded,
    results,
    isQuestion,
    selectedIndex,
    aiStatus,
    aiAnswer,
    aiSources,
    aiError,
    feedbackSent,
    setActiveIndex,
    handleQueryChange,
    askAI,
    resetAiState,
    sendFeedback,
  } = useDocsSearchAi({
    canAskAi,
    authChecked,
    feedbackSurface,
  });

  const { trapTabKey } = useModalA11y({
    dialogRef,
    initialFocusRef: inputRef,
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapTabKey(event)) return;

    const isInputFocused = document.activeElement === inputRef.current;

    if (
      canAskAi &&
      isInputFocused &&
      (event.metaKey || event.ctrlKey) &&
      event.key === "Enter" &&
      aiStatus === "idle" &&
      query.trim()
    ) {
      event.preventDefault();
      void askAI();
      return;
    }

    if (event.key === "ArrowDown" && isInputFocused) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp" && isInputFocused) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (
      event.key === "Enter" &&
      isInputFocused &&
      aiStatus === "idle" &&
      results[selectedIndex]
    ) {
      event.preventDefault();
      onNavigate(results[selectedIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (aiStatus !== "idle") {
        resetAiState();
      } else {
        onClose();
      }
    }
  };

  const showAiPanel = aiStatus !== "idle" && canAskAi;
  const maxResultsClass = showAiPanel ? "max-h-40" : "max-h-80";

  return (
    <div className="fixed inset-0 z-[100]" onKeyDown={handleKeyDown}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mx-auto mt-[12vh] max-w-xl">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={a11yTitleId}
          aria-describedby={a11yDescId}
          className="bg-bg-card border border-border-light rounded-2xl shadow-2xl overflow-hidden"
        >
          <h2 id={a11yTitleId} className="sr-only">
            {title}
          </h2>
          <p id={a11yDescId} className="sr-only">
            {description}
          </p>

          <div className="flex items-center gap-3 px-5 border-b border-border">
            <Search className="w-5 h-5 text-text-dim shrink-0" />
            <label htmlFor={inputId} className="sr-only">
              {placeholder}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder={placeholder}
              className="flex-1 py-4 bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-dim"
            />
            <kbd className="text-[11px] font-mono bg-bg-dark border border-border rounded px-1.5 py-0.5 text-text-dim">
              ESC
            </kbd>
          </div>

          {query.trim() && aiStatus === "idle" && authChecked && canAskAi && (
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border">
              <button
                type="button"
                onClick={() => {
                  void askAI();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
                  isQuestion
                    ? "bg-accent/20 text-accent border border-accent/30 shadow-[0_0_10px_rgba(217,140,46,0.15)]"
                    : "bg-bg-dark text-text-dim border border-border hover:border-border-light"
                }`}
                aria-label="Ask AI using the current query"
              >
                <Sparkles className="w-3 h-3" />
                Ask AI
              </button>
              {isQuestion && (
                <span className="text-[11px] text-text-dim">
                  Press{" "}
                  <kbd className="font-mono bg-bg-dark border border-border rounded px-1 py-px">
                    ⌘↵ / Ctrl↵
                  </kbd>{" "}
                  to ask
                </span>
              )}
            </div>
          )}

          {query.trim() && aiStatus === "idle" && authChecked && !canAskAi && renderSignInPrompt?.()}

          {showAiPanel && (
            <AiAnswerPanel
              status={aiStatus as Exclude<DocsAiStatus, "idle">}
              answer={aiAnswer}
              sources={aiSources}
              error={aiError}
              feedbackSent={feedbackSent}
              onRetry={() => {
                void askAI();
              }}
              onFeedback={sendFeedback}
              onSourceClick={onNavigateToSlug}
            />
          )}

          <div
            className={`${maxResultsClass} overflow-y-auto transition-[max-height] duration-200`}
          >
            {!loaded && (
              <div className="px-5 py-8 text-center text-sm text-text-dim">
                Loading search index...
              </div>
            )}

            {loaded && query && results.length === 0 && aiStatus === "idle" && (
              <div className="px-5 py-8 text-center text-sm text-text-dim">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {results.map((result, index) => (
              <button
                key={`${result.slug}-${result.headingId ?? "page"}-${index}`}
                onClick={() => onNavigate(result)}
                className={`flex items-center gap-3 w-full px-5 py-3 text-left transition-colors cursor-pointer ${
                  index === selectedIndex ? "bg-accent-dim" : "hover:bg-bg-card-hover"
                }`}
              >
                {result.headingId ? (
                  <Hash className="w-4 h-4 text-text-dim shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-text-dim shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm truncate ${
                      index === selectedIndex ? "text-accent" : "text-text-primary"
                    }`}
                  >
                    {result.title}
                  </div>
                  <div className="text-xs text-text-dim truncate">{result.section}</div>
                </div>
                {index === selectedIndex && (
                  <ArrowRight className="w-4 h-4 text-accent shrink-0" />
                )}
              </button>
            ))}

            {loaded && !query && (
              <div className="px-5 py-8 text-center text-sm text-text-dim">
                Type to search the documentation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
