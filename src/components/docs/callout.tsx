import { Info, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

const VARIANTS = {
  info: {
    icon: Info,
    bg: "rgba(96, 165, 250, 0.05)",
    border: "rgba(96, 165, 250, 0.2)",
    iconColor: "rgb(96, 165, 250)",
  },
  warning: {
    icon: AlertTriangle,
    bg: "rgba(217, 140, 46, 0.05)",
    border: "rgba(217, 140, 46, 0.2)",
    iconColor: "var(--accent)",
  },
  success: {
    icon: CheckCircle,
    bg: "rgba(90, 138, 60, 0.05)",
    border: "rgba(90, 138, 60, 0.2)",
    iconColor: "var(--green-bright)",
  },
  tip: {
    icon: Lightbulb,
    bg: "rgba(233, 164, 74, 0.05)",
    border: "rgba(233, 164, 74, 0.2)",
    iconColor: "var(--accent-light)",
  },
} as const;

interface CalloutProps {
  variant?: keyof typeof VARIANTS;
  title?: string;
  children: ReactNode;
}

export function Callout({
  variant = "info",
  title,
  children,
}: CalloutProps) {
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl p-5 flex gap-4 my-6"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      <Icon
        className="w-5 h-5 mt-0.5 shrink-0"
        style={{ color: config.iconColor }}
      />
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold text-text-primary text-sm mb-1">
            {title}
          </p>
        )}
        <div className="text-sm text-text-secondary leading-relaxed [&>p]:mb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
