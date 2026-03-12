import type { DeityMarkProps } from "./types";

export function Hephaestus({ size = 24, className }: DeityMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Anvil/hammer — builder/skills */}
      <path d="M6 14h12v3H6z" />
      <path d="M8 17v4M16 17v4" />
      <path d="M4 14h16" />
      <path d="M9 14V9h6v5" />
      <path d="M14 9l3-5h2l-3 5" />
      <path d="M15 4h4v2h-4" />
    </svg>
  );
}
