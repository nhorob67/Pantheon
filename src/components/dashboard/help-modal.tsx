"use client";

import { useCallback } from "react";
import { useHelp } from "./help-provider";
import { DocsSearchModalBase, type SearchResult } from "@/components/docs/docs-search-modal-base";

export function HelpModal() {
  const {
    actions: { closeHelp },
  } = useHelp();

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

  return (
    <DocsSearchModalBase
      canAskAi
      authChecked
      feedbackSurface="dashboard_help_modal"
      onClose={closeHelp}
      onNavigate={openDocsPage}
      onNavigateToSlug={openDocsSlug}
      a11yTitleId="dashboard-help-modal-title"
      a11yDescId="dashboard-help-modal-description"
      title="Dashboard help"
      description="Search Pantheon documentation and ask AI support questions."
      placeholder="Search help or ask a question..."
      inputId="dashboard-help-input"
    />
  );
}
