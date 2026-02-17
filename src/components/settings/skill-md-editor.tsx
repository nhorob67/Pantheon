"use client";

import { useRef } from "react";
import { Bold, Italic, Heading2, Code, List } from "lucide-react";

interface SkillMdEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SkillMdEditor({ value, onChange, disabled }: SkillMdEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (before: string, after: string = "") => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newText =
      value.slice(0, start) + before + selected + after + value.slice(end);

    onChange(newText);

    // Restore cursor position
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = start + before.length + selected.length;
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const lineCount = value.split("\n").length;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-bg-dark border-b border-border">
        <button
          type="button"
          onClick={() => insertMarkdown("**", "**")}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("_", "_")}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("## ")}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Heading"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("```\n", "\n```")}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Code"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("- ")}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-text-dim hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="List"
        >
          <List className="w-4 h-4" />
        </button>

        <span className="ml-auto text-xs text-text-dim font-mono">
          {value.length.toLocaleString()} chars | {lineCount} lines
        </span>
      </div>

      {/* Editor area */}
      <div className="relative">
        {/* Line numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-bg-deep border-r border-border overflow-hidden pointer-events-none">
          <div className="pt-4 px-2">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className="text-xs text-text-dim text-right leading-[1.7rem] font-mono select-none"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          spellCheck={false}
          className="w-full min-h-[400px] bg-bg-deep text-text-primary font-mono text-sm leading-[1.7rem] pl-14 pr-4 py-4 outline-none resize-y disabled:opacity-50"
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}
