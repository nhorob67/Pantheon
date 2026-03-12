import type { DeityMarkProps } from "./types";

export function Artemis({ size = 24, className }: DeityMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Arrow/moon — scheduling */}
      <path d="M21 12A9 9 0 0 1 6 18.5 7 7 0 0 0 21 12z" />
      <path d="M3 12l7-7M3 12l7 7M3 12h14" />
    </svg>
  );
}
