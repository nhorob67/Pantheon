export const DOCS_ASK_FEEDBACK_SURFACES = [
  "docs_modal",
  "dashboard_help_modal",
] as const;

export type DocsAskFeedbackSurface =
  (typeof DOCS_ASK_FEEDBACK_SURFACES)[number];
