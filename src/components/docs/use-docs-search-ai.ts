"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSearchIndex, type SearchIndexEntry } from "@/lib/docs/search-index";
import type { DocsAskFeedbackSurface } from "@/lib/docs/ask-feedback-surface";

const QUESTION_STARTERS =
  /^(how|what|why|when|where|which|who|can|does|is|are|do|should|will|could|would)\b/i;

export interface SearchResult {
  slug: string;
  title: string;
  section: string;
  headingId?: string;
  headingTitle?: string;
}

export interface AiSource {
  title: string;
  slug: string;
}

interface UseDocsSearchAiOptions {
  canAskAi: boolean;
  authChecked?: boolean;
  feedbackSurface: DocsAskFeedbackSurface;
}

function looksLikeQuestion(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.includes("?")) return true;
  if (QUESTION_STARTERS.test(trimmed) && trimmed.length > 10) return true;
  return false;
}

export function useDocsSearchAi({
  canAskAi,
  authChecked = true,
  feedbackSurface,
}: UseDocsSearchAiOptions) {
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [entries, setEntries] = useState<SearchIndexEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [aiMode, setAiMode] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiSources, setAiSources] = useState<AiSource[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const resetAiState = useCallback(() => {
    abortRef.current?.abort();
    setAiMode(false);
    setAiAnswer("");
    setAiSources([]);
    setAiLoading(false);
    setAiStreaming(false);
    setAiError(null);
    setFeedbackSent(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    void getSearchIndex()
      .then((data) => {
        if (!isMounted) return;
        setEntries(data);
        setLoaded(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoaded(true);
      });

    return () => {
      isMounted = false;
      abortRef.current?.abort();
    };
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matched: SearchResult[] = [];

    for (const entry of entries) {
      const text =
        `${entry.title} ${entry.section} ${entry.body}`.toLowerCase();
      const titleMatch = terms.every((term) =>
        entry.title.toLowerCase().includes(term)
      );
      const bodyMatch = terms.every((term) => text.includes(term));

      if (titleMatch || bodyMatch) {
        matched.push({
          slug: entry.slug,
          title: entry.title,
          section: entry.section,
        });
      }

      for (const heading of entry.headings) {
        if (terms.every((term) => heading.title.toLowerCase().includes(term))) {
          matched.push({
            slug: entry.slug,
            title: heading.title,
            section: entry.title,
            headingId: heading.id,
            headingTitle: heading.title,
          });
        }
      }
    }

    return matched.slice(0, 10);
  }, [entries, query]);

  const isQuestion = useMemo(() => looksLikeQuestion(query), [query]);

  const selectedIndex =
    results.length > 0 ? Math.min(activeIndex, results.length - 1) : 0;

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setActiveIndex(0);
      if (aiMode) {
        resetAiState();
      }
    },
    [aiMode, resetAiState]
  );

  const askAI = useCallback(async () => {
    if (!query.trim()) return;
    if (!authChecked) return;
    if (!canAskAi) {
      setAiError("Sign in to use Ask AI.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAiMode(true);
    setAiAnswer("");
    setAiSources([]);
    setAiLoading(true);
    setAiStreaming(false);
    setAiError(null);
    setFeedbackSent(false);

    const uniqueSlugs = [...new Set(results.map((result) => result.slug))].slice(
      0,
      5
    );
    const slugs =
      uniqueSlugs.length > 0
        ? uniqueSlugs
        : ["getting-started", "overview", "quick-start"].filter((slug) =>
            entries.some((entry) => entry.slug === slug)
          );

    try {
      const response = await fetch("/api/docs/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), slugs }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        if (response.status === 429) {
          setAiError("Too many questions. Please wait a moment.");
        } else if (response.status === 401) {
          setAiError("Please sign in to use Ask AI.");
        } else {
          setAiError(
            (errorBody as { error?: string }).error ||
              "AI service temporarily unavailable."
          );
        }
        setAiLoading(false);
        return;
      }

      setAiLoading(false);
      setAiStreaming(true);

      const reader = response.body?.getReader();
      if (!reader) {
        setAiError("AI service returned an empty response.");
        setAiStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

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
            const payload = JSON.parse(data) as {
              content?: string;
              sources?: AiSource[];
            };

            if (payload.content) {
              setAiAnswer((previous) => previous + payload.content);
            }
            if (payload.sources) {
              setAiSources(payload.sources);
            }
          } catch {
            // Keep stream processing resilient to malformed chunks.
          }
        }
      }

      setAiStreaming(false);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAiError("Could not reach the AI service. Try again.");
      setAiLoading(false);
      setAiStreaming(false);
    }
  }, [authChecked, canAskAi, entries, query, results]);

  const submitFeedback = useCallback(
    async (helpful: boolean) => {
      if (!canAskAi || !query.trim()) return;

      try {
        await fetch("/api/docs/ask-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            helpful,
            sources: aiSources,
            surface: feedbackSurface,
          }),
        });
      } catch {
        // Do not block UX on telemetry failures.
      }
    },
    [aiSources, canAskAi, feedbackSurface, query]
  );

  const sendFeedback = useCallback(
    (helpful: boolean) => {
      setFeedbackSent(true);
      void submitFeedback(helpful);
    },
    [submitFeedback]
  );

  return {
    query,
    loaded,
    results,
    isQuestion,
    selectedIndex,
    activeIndex,
    setActiveIndex,
    handleQueryChange,
    askAI,
    resetAiState,
    aiMode,
    aiAnswer,
    aiSources,
    aiLoading,
    aiStreaming,
    aiError,
    feedbackSent,
    sendFeedback,
  };
}
