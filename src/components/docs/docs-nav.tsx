"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useSearch } from "./search-provider";

export function DocsNav() {
  const {
    actions: { openSearch },
  } = useSearch();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 lg:px-8 bg-bg-deep/80 backdrop-blur-xl border-b border-border-light">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight no-underline"
          style={{ fontFamily: "var(--headline)" }}
        >
          <span className="text-text-primary">Farm</span>
          <span className="text-accent">Claw</span>
        </Link>
        <span className="bg-accent-dim text-accent font-mono text-xs px-2.5 py-1 rounded-full border border-accent/20">
          Docs
        </span>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={openSearch}
          className="hidden sm:flex items-center gap-3 bg-bg-card border border-border rounded-xl w-64 px-3.5 py-2 text-sm text-text-dim hover:border-border-light transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">Search docs...</span>
          <kbd className="text-[11px] font-mono bg-bg-dark border border-border rounded px-1.5 py-0.5 text-text-dim">
            ⌘K
          </kbd>
        </button>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/docs"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors no-underline"
          >
            Guides
          </Link>
        </nav>

        <Link
          href="/signup"
          className="bg-accent text-bg-deep text-sm font-semibold px-5 py-2 rounded-full hover:bg-accent-light transition-colors no-underline"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
