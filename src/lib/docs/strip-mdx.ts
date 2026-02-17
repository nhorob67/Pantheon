/**
 * Strip MDX/Markdown formatting to produce plain text.
 * Shared between the search-index build script and the docs AI endpoint.
 */
export function stripMdx(content: string): string {
  return content
    .replace(/^(import|export)\s+.*$/gm, "")
    .replace(/```[\s\S]*?```/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[#*_~]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
