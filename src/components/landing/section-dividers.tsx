export function ConstellationDivider() {
  return (
    <div className="constellation-divider" aria-hidden="true">
      <svg width="200" height="20" viewBox="0 0 200 20" fill="none">
        <circle cx="40" cy="10" r="2" fill="currentColor" />
        <circle cx="80" cy="10" r="1.5" fill="currentColor" />
        <circle cx="100" cy="10" r="2.5" fill="currentColor" />
        <circle cx="120" cy="10" r="1.5" fill="currentColor" />
        <circle cx="160" cy="10" r="2" fill="currentColor" />
        <line x1="42" y1="10" x2="78" y2="10" stroke="currentColor" strokeWidth="0.5" />
        <line x1="82" y1="10" x2="97" y2="10" stroke="currentColor" strokeWidth="0.5" />
        <line x1="103" y1="10" x2="118" y2="10" stroke="currentColor" strokeWidth="0.5" />
        <line x1="122" y1="10" x2="158" y2="10" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

export function InscriptionDivider({ numeral, label }: { numeral: string; label: string }) {
  return (
    <div className="inscription-divider" aria-hidden="true">
      <span className="inscription-rule" />
      <span className="inscription-text">&mdash; {numeral} &mdash; {label} &mdash;</span>
      <span className="inscription-rule" />
    </div>
  );
}
