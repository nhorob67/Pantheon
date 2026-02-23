"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { Search, FileText, Hash, ArrowRight, Sparkles } from "lucide-react";
import { useHelp } from "./help-provider";
import { AiAnswerPanel } from "@/components/docs/ai-answer-panel";
import {
  useDocsSearchAi,
  type DocsAiStatus,
  type SearchResult,
} from "@/components/docs/use-docs-search-ai";
import { useModalA11y } from "@/components/docs/use-modal-a11y";

export function HelpModal() {
  const {
    actions: { closeHelp },
  } = useHelp();
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
    canAskAi: true,
    authChecked: true,
    feedbackSurface: "dashboard_help_modal",
  });

  const { trapTabKey } = useModalA11y({
    dialogRef,
    initialFocusRef: inputRef,
  });

  const openDocsPage = useCallback(
    (result: SearchResult) => {
      const url = result.headingId
        ? `/docs/${result.slug}#${result.headingId}`
        : `/docs/${result.slug}`;
      window.open(url, "_blank", "noopener");
      closeHelp();
    },
    [closeHelp]
  );

  const openDocsSlug = useCallback(
    (slug: string) => {
      window.open(`/docs/${slug}`, "_blank", "noopener");
      closeHelp();
    },
    [closeHelp]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapTabKey(event)) return;

    const isInputFocused = document.activeElement === inputRef.current;

    if (
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
      openDocsPage(results[selectedIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (aiStatus !== "idle") {
        resetAiState();
      } else {
        closeHelp();
      }
    }
  };

  const maxResultsClass = aiStatus !== "idle" ? "max-h-40" : "max-h-80";

  return (
    <div className="fixed inset-0 z-[100]" onKeyDown={handleKeyDown}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeHelp}
      />
      <div className="relative mx-auto mt-[12vh] max-w-xl">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-help-modal-title"
          aria-describedby="dashboard-help-modal-description"
          className="bg-bg-card border border-border-light rounded-2xl shadow-2xl overflow-hidden"
        >
          <h2 id="dashboard-help-modal-title" className="sr-only">
            Dashboard help
          </h2>
          <p id="dashboard-help-modal-description" className="sr-only">
            Search FarmClaw documentation and ask AI support questions.
          </p>

          <div className="flex items-center gap-3 px-5 border-b border-border">
            <Search className="w-5 h-5 text-text-dim shrink-0" />
            <label htmlFor="dashboard-help-input" className="sr-only">
              Search help or ask a question
            </label>
            <input
              id="dashboard-help-input"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Search help or ask a question..."
              className="flex-1 py-4 bg-transparent border-none outline-none text-text-primary text-sm placeholder:text-text-dim"
            />
            <kbd className="text-[11px] font-mono bg-bg-dark border border-border rounded px-1.5 py-0.5 text-text-dim">
              ESC
            </kbd>
          </div>

          {query.trim() && aiStatus === "idle" && (
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

          {aiStatus !== "idle" && (
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
              onSourceClick={openDocsSlug}
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
                onClick={() => openDocsPage(result)}
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
