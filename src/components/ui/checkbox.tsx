"use client";

import React, { type InputHTMLAttributes, type Ref } from "react";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
  ref?: Ref<HTMLInputElement>;
}

function Checkbox({ label, error, description, className = "", id, ref, ...rest }: CheckboxProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="flex items-center gap-3 min-h-[44px] min-w-[44px] cursor-pointer px-1 py-2"
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-invalid={!!error}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ") || undefined}
          className={[
            "h-5 w-5 shrink-0 cursor-pointer appearance-none rounded",
            "border border-border-light bg-input",
            "checked:bg-primary checked:border-primary",
            "focus:ring-2 focus:ring-primary/40 focus:outline-none focus:ring-offset-1 focus:ring-offset-background",
            "transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-destructive focus:ring-destructive/40" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />

        {label && (
          <span className="font-body text-sm text-foreground select-none">
            {label}
          </span>
        )}
      </label>

      {description && (
        <p id={descriptionId} className="font-body text-xs text-foreground/50 pl-8">
          {description}
        </p>
      )}

      {error && (
        <p id={errorId} className="font-body text-sm text-destructive pl-8">
          {error}
        </p>
      )}
    </div>
  );
}

Checkbox.displayName = "Checkbox";

export { Checkbox, type CheckboxProps };
