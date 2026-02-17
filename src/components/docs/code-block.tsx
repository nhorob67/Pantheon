"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  children: React.ReactNode;
  "data-language"?: string;
}

export function CodeBlock({ children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lang = props["data-language"] || "";

  const handleCopy = async () => {
    const el = document.querySelector(
      `[data-language="${lang}"] code, [data-language="${lang}"] pre code`
    );
    const text = el?.textContent || "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="code-block-wrapper group relative rounded-xl border border-border overflow-hidden my-6"
      data-language={lang}
    >
      {lang && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-card">
          <span className="text-xs font-mono text-text-dim">{lang}</span>
        </div>
      )}
      <div className="relative">
        {children}
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded-md bg-bg-card border border-border text-text-dim hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-bright" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
