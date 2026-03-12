"use client";

import React, { type TextareaHTMLAttributes, type Ref } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

function Textarea({ label, error, className = "", id, rows = 4, ref, ...rest }: TextareaProps) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const errorId = error ? `${textareaId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="font-body text-sm text-foreground/70"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={[
          "border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/40",
          "rounded-lg bg-input px-4 py-3 font-body text-foreground",
          "outline-none transition-colors duration-150",
          "placeholder:text-foreground/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "resize-y",
          error ? "border-destructive focus:border-destructive focus:ring-destructive/40" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />

      {error && (
        <p id={errorId} className="font-body text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

Textarea.displayName = "Textarea";

export { Textarea, type TextareaProps };
