import React, { type HTMLAttributes } from "react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-primary/10 text-primary",
  warning: "bg-energy/10 text-amber-700",
  error: "bg-destructive/10 text-destructive",
  info: "bg-intelligence/10 text-intelligence",
  neutral: "bg-muted text-foreground/60",
};

function Badge({
  variant = "neutral",
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </span>
  );
}

export { Badge, type BadgeProps, type BadgeVariant };
