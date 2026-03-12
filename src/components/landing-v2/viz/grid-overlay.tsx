export function GridOverlay({ spacing = 60, className }: { spacing?: number; className?: string }) {
  const cols = Math.ceil(1400 / spacing);
  const rows = Math.ceil(900 / spacing);

  return (
    <svg
      className={`v2-grid-overlay ${className ?? ""}`}
      viewBox="0 0 1400 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {Array.from({ length: cols + 1 }, (_, i) => (
        <line key={`v${i}`} x1={i * spacing} y1={0} x2={i * spacing} y2={900} />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * spacing} x2={1400} y2={i * spacing} />
      ))}
    </svg>
  );
}
