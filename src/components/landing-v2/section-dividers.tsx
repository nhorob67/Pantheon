interface InscriptionDividerProps {
  numeral: string;
  label: string;
}

export function InscriptionDivider({ numeral, label }: InscriptionDividerProps) {
  return (
    <div className="v2-divider v2-container">
      <div className="v2-divider-line" />
      <div className="v2-divider-label">{numeral} &mdash; {label}</div>
      <div className="v2-divider-line" />
    </div>
  );
}

export function ScanlineDivider() {
  return (
    <div className="v2-container" style={{ padding: "24px 0" }}>
      <div className="v2-divider-line" />
    </div>
  );
}
