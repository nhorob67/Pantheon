"use client";

import { Athena, Hermes, Ares, Apollo, Hephaestus, Artemis } from "../deity-marks";
import type { DeityMarkProps } from "../deity-marks";

interface DeityRingProps {
  size?: number;
  markSize?: number;
  className?: string;
  animated?: boolean;
}

const DEITIES: { component: React.ComponentType<DeityMarkProps>; label: string }[] = [
  { component: Athena, label: "Athena — Strategy" },
  { component: Hermes, label: "Hermes — Communications" },
  { component: Apollo, label: "Apollo — Research" },
  { component: Artemis, label: "Artemis — Tracking" },
  { component: Hephaestus, label: "Hephaestus — Building" },
  { component: Ares, label: "Ares — Operations" },
];

function computePositions(size: number) {
  const center = size / 2;
  const radius = size * 0.35;
  return DEITIES.map((_, i) => {
    const angle = (i * 2 * Math.PI) / DEITIES.length - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });
}

export function DeityRing({ size = 320, markSize = 32, className, animated = true }: DeityRingProps) {
  const center = size / 2;
  const positions = computePositions(size);

  return (
    <div
      className={`v2-deity-ring ${animated ? "v2-deity-ring-animated" : ""} ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        {positions.map((pos, i) => {
          const next = positions[(i + 1) % positions.length];
          return (
            <line
              key={i}
              x1={pos.x} y1={pos.y} x2={next.x} y2={next.y}
              stroke="var(--gold-divine)" strokeWidth={1} opacity={0.15}
            />
          );
        })}
        {positions.map((pos, i) => {
          const opposite = positions[(i + 3) % positions.length];
          return (
            <line
              key={`cross-${i}`}
              x1={pos.x} y1={pos.y} x2={opposite.x} y2={opposite.y}
              stroke="var(--gold-divine)" strokeWidth={0.5} opacity={0.06}
            />
          );
        })}
        <circle cx={center} cy={center} r={2} fill="var(--gold-divine)" opacity={0.3} />
      </svg>

      {DEITIES.map((deity, i) => {
        const Mark = deity.component;
        const pos = positions[i];
        return (
          <div
            key={deity.label}
            className={`v2-deity-ring-mark ${animated ? "v2-deity-ring-mark-counter" : ""}`}
            style={{
              position: "absolute",
              left: pos.x - markSize / 2,
              top: pos.y - markSize / 2,
            }}
            title={deity.label}
          >
            <Mark size={markSize} />
          </div>
        );
      })}
    </div>
  );
}
