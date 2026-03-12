export function StatusIndicator({ active = false, className }: { active?: boolean; className?: string }) {
  return (
    <span className={`status-indicator ${active ? "status-active" : "status-idle"} ${className ?? ""}`}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
        <rect x="1.17" y="1.17" width="5.66" height="5.66" transform="rotate(45 4 4)" />
      </svg>
    </span>
  );
}
