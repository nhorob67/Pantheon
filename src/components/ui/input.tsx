"use client";

import React, { type InputHTMLAttributes, type Ref } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}

function Input({ label, error, className = "", id, ref, ...rest }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="font-body text-sm text-foreground/70"
        >
          {label}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        className={[
          "border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/20",
          "rounded-lg bg-input px-4 py-3 font-body text-foreground",
          "outline-none transition-colors duration-150",
          "placeholder:text-foreground/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          error ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />

      {error && (
        <p className="font-body text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

Input.displayName = "Input";

export { Input, type InputProps };
