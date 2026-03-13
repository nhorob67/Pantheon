"use client";

import { escapeHtml } from "@/lib/security/escape-html";
import "./skill-preview.css";

interface SkillPreviewProps {
  skillMd: string;
}

function parseFrontmatter(md: string): { frontmatter: Record<string, string>; body: string } {
  const match = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: md };

  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && !line.startsWith(" ") && !line.startsWith("\t")) {
      fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }

  return { frontmatter: fm, body: match[2] };
}

function renderMarkdown(text: string): string {
  const html = escapeHtml(text)
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="skill-code-block"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="skill-inline-code">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="skill-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="skill-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="skill-h2">$1</h2>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Lists
    .replace(/^- (.+)$/gm, '<li class="skill-li">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="skill-li">$2</li>')
    // Paragraphs (blank lines)
    .replace(/\n\n/g, '</p><p class="skill-p">');

  return `<p class="skill-p">${html}</p>`;
}

export function SkillPreview({ skillMd }: SkillPreviewProps) {
  if (!skillMd.trim()) {
    return (
      <div className="flex items-center justify-center h-64 text-text-dim text-sm">
        No content to preview
      </div>
    );
  }

  const { frontmatter, body } = parseFrontmatter(skillMd);

  return (
    <div className="skill-preview">
      {/* Frontmatter display */}
      {Object.keys(frontmatter).length > 0 && (
        <div className="mb-6 rounded-lg bg-bg-deep border border-border p-4">
          <p className="text-xs text-text-dim font-mono uppercase tracking-wider mb-2">Frontmatter</p>
          <div className="space-y-1">
            {Object.entries(frontmatter).map(([key, val]) => (
              <div key={key} className="flex items-baseline gap-2 text-sm">
                <span className="text-accent font-mono">{key}:</span>
                <span className="text-text-secondary">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rendered body */}
      <div
        className="skill-preview-body prose-dark"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
      />

    </div>
  );
}
