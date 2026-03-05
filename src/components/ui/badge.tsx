import React, { type HTMLAttributes } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, Minus } from "lucide-react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-primary/10 text-primary",
  warning: "bg-energy/10 text-energy",
  error: "bg-destructive/10 text-destructive",
  info: "bg-intelligence/10 text-intelligence",
  neutral: "bg-muted text-foreground/60",
};

const variantIcons: Record<BadgeVariant, React.ReactNode> = {
  success: <CheckCircle2 className="w-3 h-3" aria-hidden="true" />,
  warning: <AlertTriangle className="w-3 h-3" aria-hidden="true" />,
  error: <XCircle className="w-3 h-3" aria-hidden="true" />,
  info: <Info className="w-3 h-3" aria-hidden="true" />,
  neutral: <Minus className="w-3 h-3" aria-hidden="true" />,
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
        "inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {variantIcons[variant]}
      {children}
    </span>
  );
}

export { Badge, type BadgeProps, type BadgeVariant };
