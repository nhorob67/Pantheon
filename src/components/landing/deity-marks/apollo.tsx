import type { DeityMarkProps } from "./types";

export function Apollo({ size = 24, className }: DeityMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Radiant arc — research/analysis */}
      <circle cx="12" cy="14" r="5" />
      <path d="M12 3v3" />
      <path d="M5.6 7.6l2.1 2.1" />
      <path d="M18.4 7.6l-2.1 2.1" />
      <path d="M3 14h3" />
      <path d="M18 14h3" />
      <path d="M12 9v5l3 2" />
    </svg>
  );
}
