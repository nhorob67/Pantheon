"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSearchIndex, getFlexSearchIndex, type SearchIndexEntry } from "@/lib/docs/search-index";
import type { Index as FlexSearchIndexType } from "flexsearch";
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

export type DocsAiStatus = "idle" | "loading" | "streaming" | "error" | "ready";

interface DocsAiState {
  status: DocsAiStatus;
  answer: string;
  sources: AiSource[];
  error: string | null;
  feedbackSent: boolean;
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
  const [flexIndex, setFlexIndex] = useState<FlexSearchIndexType | null>(null);

  const [aiState, setAiState] = useState<DocsAiState>({
    status: "idle",
    answer: "",
    sources: [],
    error: null,
    feedbackSent: false,
  });

  const aiMode = aiState.status !== "idle";

  const resetAiState = useCallback(() => {
    abortRef.current?.abort();
    setAiState({
      status: "idle",
      answer: "",
      sources: [],
      error: null,
      feedbackSent: false,
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    void getSearchIndex()
      .then(async (data) => {
        if (!isMounted) return;
        setEntries(data);
        // Eagerly build the FlexSearch index so searches are synchronous
        const idx = await getFlexSearchIndex(data);
        if (isMounted) {
          setFlexIndex(idx);
        }
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
    if (!query.trim() || !flexIndex) return [];

    const matchedIndices = flexIndex.search(query, { limit: 15 }) as number[];

    const matched: SearchResult[] = [];
    const seen = new Set<string>();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    for (const idx of matchedIndices) {
      const entry = entries[idx];
      if (!entry || seen.has(entry.slug)) continue;
      seen.add(entry.slug);

      matched.push({
        slug: entry.slug,
        title: entry.title,
        section: entry.section,
      });

      // Check headings for anchor-level results
      for (const heading of entry.headings) {
        if (terms.some((term) => heading.title.toLowerCase().includes(term))) {
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
  }, [entries, flexIndex, query]);

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
      setAiState({
        status: "error",
        answer: "",
        sources: [],
        error: "Sign in to use Ask AI.",
        feedbackSent: false,
      });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAiState({
      status: "loading",
      answer: "",
      sources: [],
      error: null,
      feedbackSent: false,
    });

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
        const message =
          response.status === 429
            ? "Too many questions. Please wait a moment."
            : response.status === 401
              ? "Please sign in to use Ask AI."
              : (errorBody as { error?: string }).error ||
                "AI service temporarily unavailable.";

        setAiState({
          status: "error",
          answer: "",
          sources: [],
          error: message,
          feedbackSent: false,
        });

        return;
      }

      setAiState((previous) => ({
        ...previous,
        status: "streaming",
        error: null,
      }));

      const reader = response.body?.getReader();
      if (!reader) {
        setAiState({
          status: "error",
          answer: "",
          sources: [],
          error: "AI service returned an empty response.",
          feedbackSent: false,
        });
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

            setAiState((previous) => ({
              ...previous,
              answer: payload.content ? previous.answer + payload.content : previous.answer,
              sources: payload.sources || previous.sources,
            }));
          } catch {
            // Keep stream processing resilient to malformed chunks.
          }
        }
      }

      setAiState((previous) => ({
        ...previous,
        status: "ready",
      }));
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setAiState((previous) => ({
        ...previous,
        status: "error",
        error: "Could not reach the AI service. Try again.",
      }));
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
            sources: aiState.sources,
            surface: feedbackSurface,
          }),
        });
      } catch {
        // Do not block UX on telemetry failures.
      }
    },
    [aiState.sources, canAskAi, feedbackSurface, query]
  );

  const sendFeedback = useCallback(
    (helpful: boolean) => {
      setAiState((previous) => ({
        ...previous,
        feedbackSent: true,
      }));
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
    aiStatus: aiState.status,
    aiAnswer: aiState.answer,
    aiSources: aiState.sources,
    aiError: aiState.error,
    feedbackSent: aiState.feedbackSent,
    sendFeedback,
  };
}
