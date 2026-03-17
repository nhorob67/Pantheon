import type { DocumentContent } from "@/types/file-creation";

/**
 * Escape HTML special characters to prevent XSS in generated documents.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generate an HTML document buffer from document content.
 */
export function generateHtml(content: DocumentContent): Buffer {
  const title = content.title ? escapeHtml(content.title) : "Document";

  const bodyParts: string[] = [];

  if (content.title) {
    bodyParts.push(`    <h1>${escapeHtml(content.title)}</h1>`);
  }

  for (const section of content.sections) {
    if (section.heading) {
      bodyParts.push(`    <h2>${escapeHtml(section.heading)}</h2>`);
    }
    if (section.body) {
      // Split on double newlines for paragraphs
      const paragraphs = section.body.split(/\n{2,}/);
      for (const p of paragraphs) {
        bodyParts.push(`    <p>${escapeHtml(p.trim())}</p>`);
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #222; }
    h1 { border-bottom: 2px solid #eee; padding-bottom: 0.3rem; }
    h2 { margin-top: 1.5rem; color: #444; }
    p { margin: 0.5rem 0; }
  </style>
</head>
<body>
${bodyParts.join("\n")}
</body>
</html>
`;

  return Buffer.from(html, "utf-8");
}
