"use client";

import { AnimatedSection } from "./animated-section";

const protocols = [
  { title: "Sovereign Data", desc: "Every operation receives its own isolated partition. Your intelligence never intersects with another council." },
  { title: "Full Extraction Rights", desc: "Export everything as CSV or JSON from your command center. Your data belongs to you, always." },
  { title: "No Binding Oaths", desc: "Monthly tribute. No contracts. No lock-in. Dissolve your council in two clicks." },
];

export function SwornProtocols() {
  return (
    <AnimatedSection>
      <div className="v2-mono" style={{ marginBottom: 16, color: "var(--green-bright)" }}>
        Security Clearance: Verified
      </div>
      <div className="v2-protocols-bar">
        {protocols.map((p) => (
          <div key={p.title} className="v2-protocol-segment">
            <div className="v2-protocol-title">{p.title}</div>
            <div className="v2-protocol-desc">{p.desc}</div>
          </div>
        ))}
      </div>
    </AnimatedSection>
  );
}
