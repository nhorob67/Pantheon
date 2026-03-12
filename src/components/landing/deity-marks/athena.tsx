import type { DeityMarkProps } from "./types";

export function Athena({ size = 24, className }: DeityMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Owl glyph — wisdom/strategy */}
      <circle cx="9" cy="10" r="2.5" />
      <circle cx="15" cy="10" r="2.5" />
      <path d="M6.5 10c0-4 2.5-6 5.5-6s5.5 2 5.5 6" />
      <path d="M12 12.5v2" />
      <path d="M10 15.5l2 2 2-2" />
      <path d="M7 14c-1 1.5-1 3 0 4" />
      <path d="M17 14c1 1.5 1 3 0 4" />
      <path d="M12 4l-1.5-2M12 4l1.5-2" />
    </svg>
  );
}
