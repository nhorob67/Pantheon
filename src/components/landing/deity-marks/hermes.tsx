import type { DeityMarkProps } from "./types";

export function Hermes({ size = 24, className }: DeityMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Caduceus/wing — communications */}
      <path d="M12 22V6" />
      <path d="M12 6l-4 4c0 2 2 3 4 2" />
      <path d="M12 6l4 4c0 2-2 3-4 2" />
      <path d="M12 10l-3.5 3.5c0 1.8 1.5 2.5 3.5 1.5" />
      <path d="M12 10l3.5 3.5c0 1.8-1.5 2.5-3.5 1.5" />
      <circle cx="12" cy="4" r="2" />
      <path d="M6 4l2 1M18 4l-2 1" />
      <path d="M4 5l2.5 0M20 5l-2.5 0" />
    </svg>
  );
}
