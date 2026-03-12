"use client";

import { AnimatedSection, SectionHeader } from "./animated-section";
import { DashboardPanel } from "./panels/dashboard-panel";
import { MissionTimeline } from "./panels/mission-timeline";
import { Athena, Hermes, Ares, Apollo, Hephaestus, Artemis } from "./deity-marks";

const steps = [
  {
    num: "I",
    title: "Define Your Operation",
    description: "Declare your domains, your challenges, the intelligence your operation requires. Three minutes of your attention.",
  },
  {
    num: "II",
    title: "Open the Gates",
    description: "One invitation link. Pantheon enters your Discord server. No developer portals, no configuration rituals.",
  },
  {
    num: "III",
    title: "The Council Convenes",
    description: "Each agent assumes its domain. Signals are intercepted, briefings are assembled, standing orders are executed.",
  },
];

const schematicMarks = [Athena, Hermes, Ares, Apollo, Hephaestus, Artemis];
const schematicPositions = [
  { x: 100, y: 60 }, { x: 200, y: 40 }, { x: 300, y: 60 },
  { x: 100, y: 140 }, { x: 200, y: 160 }, { x: 300, y: 140 },
];

function DeploymentSchematic() {
  return (
    <DashboardPanel title="Deployment Schematic" meta="PHASE I-III">
      <div style={{ position: "relative", minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="400" height="200" viewBox="0 0 400 200" aria-hidden="true" style={{ maxWidth: "100%" }}>
          {schematicPositions.map((pos, i) => {
            const connections = i < 3 ? [i + 3] : [];
            if (i < schematicPositions.length - 1 && Math.abs(schematicPositions[i + 1].y - pos.y) < 40) connections.push(i + 1);
            return connections.map((j) => (
              <line
                key={`${i}-${j}`}
                x1={pos.x} y1={pos.y} x2={schematicPositions[j].x} y2={schematicPositions[j].y}
                stroke="var(--gold-divine)" strokeWidth={1} opacity={0.15}
              />
            ));
          })}
          <rect x={170} y={85} width={60} height={30} rx={4} fill="none" stroke="var(--text-dim)" strokeWidth={1} opacity={0.3} />
          <text x={200} y={104} textAnchor="middle" fill="var(--text-dim)" fontSize={8} fontFamily="monospace">DISCORD</text>
        </svg>
        {schematicMarks.map((Mark, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(schematicPositions[i].x / 400) * 100}%`,
              top: `${(schematicPositions[i].y / 200) * 100}%`,
              transform: "translate(-50%, -50%)",
              color: "var(--gold-divine)",
            }}
          >
            <Mark size={22} />
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

export function WarRoom() {
  return (
    <AnimatedSection id="how">
      <SectionHeader label="Deployment Protocol" title="Assembly requires three minutes. Governance begins immediately." />
      <div className="v2-war-room">
        <div className="v2-war-room-visual">
          <DeploymentSchematic />
        </div>
        <MissionTimeline steps={steps} />
      </div>
    </AnimatedSection>
  );
}
