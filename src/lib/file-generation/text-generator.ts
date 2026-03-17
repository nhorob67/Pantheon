import type { DocumentContent } from "@/types/file-creation";

/**
 * Generate a plain text or Markdown buffer from document content.
 */
export function generateText(content: DocumentContent): Buffer {
  const parts: string[] = [];

  if (content.title) {
    parts.push(content.title);
    parts.push("=".repeat(content.title.length));
    parts.push("");
  }

  for (const section of content.sections) {
    if (section.heading) {
      parts.push(section.heading);
      parts.push("-".repeat(section.heading.length));
    }
    if (section.body) {
      parts.push(section.body);
    }
    parts.push("");
  }

  return Buffer.from(parts.join("\n"), "utf-8");
}
