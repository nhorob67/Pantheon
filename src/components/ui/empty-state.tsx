import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type EmptyStateSize = "compact" | "default" | "large";
type EmptyStateKind = "first-time" | "filtered" | "inline";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  action?: EmptyStateAction;
  size?: EmptyStateSize;
  kind?: EmptyStateKind;
  bordered?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const SIZE_CONFIG = {
  large: {
    padding: "py-24 px-8",
    iconContainer: "w-18 h-18 rounded-2xl",
    icon: "w-9 h-9",
    title: "text-lg",
    descMaxW: "max-w-md",
  },
  default: {
    padding: "py-16 px-6",
    iconContainer: "w-14 h-14 rounded-2xl",
    icon: "w-7 h-7",
    title: "text-base",
    descMaxW: "max-w-sm",
  },
  compact: {
    padding: "py-6 px-4",
    iconContainer: "w-10 h-10 rounded-xl",
    icon: "w-5 h-5",
    title: "text-sm",
    descMaxW: "max-w-xs",
  },
} as const;

function ActionButton({ action }: { action: EmptyStateAction }) {
  const ActionIcon = action.icon;
  const variant = action.variant ?? "secondary";

  const classes = {
    primary:
      "inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-bg-deep font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors cursor-pointer",
    secondary:
      "inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-light transition-colors",
    ghost:
      "inline-flex items-center gap-2 text-sm font-medium text-foreground/50 hover:text-foreground/70 transition-colors",
  }[variant];

  const content = (
    <>
      {ActionIcon && <ActionIcon className="w-4 h-4" />}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Link href={action.href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={classes}>
      {content}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  action,
  size = "default",
  kind = "first-time",
  bordered = false,
  className = "",
  children,
}: EmptyStateProps) {
  const config = SIZE_CONFIG[size];

  // Merge single action into actions array for backward compat
  const allActions = actions ?? (action ? [action] : []);

  const showGlow = size === "large" && kind === "first-time";

  const content = (
    <div
      className={`flex flex-col items-center justify-center ${config.padding} text-center ${className}`}
    >
      {Icon && kind === "first-time" && (
        <div
          className={`${config.iconContainer} bg-gradient-to-br from-energy/10 to-primary/10 border border-energy/10 flex items-center justify-center mb-4 ${showGlow ? "animate-[empty-state-glow_4s_ease-in-out_infinite]" : ""}`}
        >
          <Icon className={`${config.icon} text-energy/70`} />
        </div>
      )}
      {Icon && kind === "filtered" && (
        <div className="mb-3">
          <Icon className={`${config.icon} text-foreground/30`} />
        </div>
      )}
      {Icon && kind === "inline" && (
        <div className="mb-2">
          <Icon className={`${config.icon} text-foreground/30`} />
        </div>
      )}
      <h3
        className={`font-headline ${config.title} font-semibold text-foreground mb-1`}
      >
        {title}
      </h3>
      {description && (
        <p className={`text-sm text-foreground/60 ${config.descMaxW}`}>
          {description}
        </p>
      )}
      {allActions.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          {allActions.map((a) => (
            <ActionButton key={a.label} action={a} />
          ))}
        </div>
      )}
      {children}
    </div>
  );

  if (bordered) {
    return (
      <div className="rounded-xl border border-dashed border-border">
        {content}
      </div>
    );
  }

  return content;
}
