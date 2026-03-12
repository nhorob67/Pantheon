"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence } from "motion/react";
import type { DeityMarkProps } from "../deity-marks";
import { getClearanceClass } from "../data/agents";

type Clearance = "L1 ADVISORY" | "L2 OPERATIONAL" | "L3 FULL";

interface AgentDossierCardProps {
  name: string;
  domain: string;
  mark: React.ComponentType<DeityMarkProps>;
  capabilities: string[];
  missions: string[];
  clearance: Clearance;
  glowColor?: string;
}

export function AgentDossierCard({
  name,
  domain,
  mark: Mark,
  capabilities,
  missions,
  clearance,
  glowColor,
}: AgentDossierCardProps) {
  const [missionIdx, setMissionIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMissionIdx((prev) => (prev + 1) % missions.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [missions.length]);

  return (
    <div
      className="v2-dossier-card"
      style={glowColor ? { ["--dossier-glow" as string]: glowColor } : undefined}
    >
      <div className="v2-dossier-header">
        <span className="v2-dossier-mark">
          <Mark size={48} />
        </span>
        <div>
          <div className="v2-dossier-name">{name}</div>
          <div className="v2-dossier-domain">{domain}</div>
        </div>
      </div>

      <div className="v2-dossier-section-label">Capabilities</div>
      <ul className="v2-dossier-capabilities">
        {capabilities.map((cap) => (
          <li key={cap}>{cap}</li>
        ))}
      </ul>

      <div className="v2-dossier-section-label">Current Mission</div>
      <div className="v2-dossier-mission">
        <AnimatePresence mode="wait">
          <m.span
            key={missionIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {missions[missionIdx]}
          </m.span>
        </AnimatePresence>
      </div>

      <div className={`v2-dossier-clearance ${getClearanceClass(clearance)}`}>{clearance}</div>
    </div>
  );
}
