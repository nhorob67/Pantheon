"use client";

import React, { type Ref, type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  ref?: Ref<HTMLSelectElement>;
}

function Select({ label, error, options, className = "", id, ref, ...rest }: SelectProps) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="font-body text-sm text-foreground/70"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={[
            "w-full appearance-none",
            "border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/20",
            "rounded-lg bg-input px-4 py-3 pr-10 font-body text-foreground",
            "outline-none transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Chevron indicator */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="h-4 w-4 text-foreground/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {error && (
        <p className="font-body text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

Select.displayName = "Select";

export { Select, type SelectProps, type SelectOption };
