import { HelpCircle } from "lucide-react";

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  return (
    <span className="relative inline-flex items-center group ml-1" tabIndex={0}>
      <HelpCircle
        className="w-3.5 h-3.5 text-foreground/40 hover:text-foreground/60 transition-colors cursor-help"
        aria-hidden="true"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground/80 shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50"
      >
        {text}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
