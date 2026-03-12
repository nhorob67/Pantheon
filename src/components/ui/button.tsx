"use client";

import React, { type ButtonHTMLAttributes, type Ref } from "react";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-energy to-accent-light text-white font-semibold rounded-full shadow-[0_4px_20px_rgba(196,136,63,0.2)] hover:shadow-[0_8px_30px_rgba(196,136,63,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_10px_rgba(196,136,63,0.15)] transition-all duration-150",
  secondary:
    "border border-border hover:bg-muted text-foreground rounded-full",
  destructive:
    "bg-destructive hover:bg-destructive/80 text-white rounded-full",
  ghost: "hover:bg-muted text-foreground rounded-full",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3",
  lg: "px-8 py-4 text-lg",
};

function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ref,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-live="polite"
      aria-busy={loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-body transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      )}
      {children}
    </button>
  );
}

Button.displayName = "Button";

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
