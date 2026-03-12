"use client";

import { useEffect, useState } from "react";
import type { TocEntry } from "@/lib/docs/headings";

interface TableOfContentsProps {
  headings: TocEntry[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden lg:block w-56 shrink-0 sticky top-24 h-fit py-10 pr-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim mb-4">
        On this page
      </p>
      <nav className="border-l border-border space-y-1">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={`block text-sm no-underline transition-colors ${
              heading.level === 3 ? "pl-6" : "pl-4"
            } py-1 ${
              activeId === heading.id
                ? "text-accent border-l-2 border-accent -ml-px"
                : "text-text-dim hover:text-text-secondary"
            }`}
          >
            {heading.title}
          </a>
        ))}
      </nav>
    </aside>
  );
}
