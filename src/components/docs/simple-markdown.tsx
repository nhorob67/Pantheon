import { type ReactNode } from "react";
import Link from "next/link";

/**
 * Lightweight inline Markdown renderer for AI answer text.
 * Handles: **bold**, `code`, [links](/path), paragraphs, line breaks, bullet lists.
 * No external dependencies.
 */
export function SimpleMarkdown({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((para, pi) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Bullet list
        if (/^[-*]\s/.test(trimmed)) {
          const items = trimmed.split(/\n/).filter((l) => /^[-*]\s/.test(l));
          return (
            <ul key={pi} className="list-disc list-inside space-y-1 my-1.5">
              {items.map((item, ii) => (
                <li key={ii}>{renderInline(item.replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={pi} className="my-1.5">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </>
  );
}

function getSafeHref(href: string): string | null {
  if (href.startsWith("/")) {
    return href.startsWith("//") ? null : href;
  }

  try {
    const parsed = new URL(href);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return href;
    }
  } catch {
    return null;
  }

  return null;
}

function renderInline(text: string): ReactNode[] {
  // Split on inline patterns: **bold**, `code`, [text](url), and line breaks
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(\n)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={key++} className="font-semibold text-text-primary">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // `code`
      parts.push(
        <code
          key={key++}
          className="px-1 py-0.5 bg-bg-dark rounded text-[13px] text-accent-light font-mono"
        >
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      // [text](url)
      const href = match[7];
      const safeHref = getSafeHref(href);
      if (!safeHref) {
        parts.push(match[6]);
      } else if (safeHref.startsWith("/")) {
        parts.push(
          <Link
            key={key++}
            href={safeHref}
            className="text-accent hover:text-accent-light underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 rounded"
          >
            {match[6]}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={key++}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-light underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 rounded"
          >
            {match[6]}
          </a>
        );
      }
    } else if (match[8]) {
      // \n → <br />
      parts.push(<br key={key++} />);
    }

    lastIndex = match.index + match[0].length;
  }

  // Trailing text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
