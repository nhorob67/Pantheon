"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "./search-provider";
import { DocsSearchModalBase, type SearchResult } from "./docs-search-modal-base";

export function SearchModal() {
  const {
    state: { canAskAi, authChecked },
    actions: { closeSearch },
  } = useSearch();
  const router = useRouter();

  const navigate = useCallback(
    (result: SearchResult) => {
      const url = result.headingId
        ? `/docs/${result.slug}#${result.headingId}`
        : `/docs/${result.slug}`;
      router.push(url);
      closeSearch();
    },
    [closeSearch, router]
  );

  const navigateToSlug = useCallback(
    (slug: string) => {
      router.push(`/docs/${slug}`);
      closeSearch();
    },
    [closeSearch, router]
  );

  return (
    <DocsSearchModalBase
      canAskAi={canAskAi}
      authChecked={authChecked}
      feedbackSurface="docs_modal"
      onClose={closeSearch}
      onNavigate={navigate}
      onNavigateToSlug={navigateToSlug}
      a11yTitleId="docs-search-modal-title"
      a11yDescId="docs-search-modal-description"
      title="Search documentation"
      description="Search Pantheon documentation and ask AI questions with cited sources."
      placeholder="Search docs or ask a question..."
      inputId="docs-search-input"
      renderSignInPrompt={() => (
        <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-b border-border">
          <span className="text-xs text-text-dim">Sign in to use Ask AI answers.</span>
          <button
            type="button"
            onClick={() => {
              router.push("/login?next=/docs");
              closeSearch();
            }}
            className="text-xs text-accent hover:text-accent-light transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 rounded"
          >
            Sign in
          </button>
        </div>
      )}
    />
  );
}
