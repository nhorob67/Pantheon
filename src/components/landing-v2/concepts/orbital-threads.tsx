"use client";

import { DEITIES, computeHexPositions } from "./deity-positions";

const SIZE = 360;
const MARK_SIZE = 28;

// Specific deity pairs for arcs (indices into DEITIES array)
const ARC_PAIRS: [number, number][] = [
  [0, 2], // Athena → Apollo
  [0, 4], // Athena → Hephaestus
  [1, 3], // Hermes → Artemis
  [1, 5], // Hermes → Ares
  [2, 4], // Apollo → Hephaestus
  [3, 5], // Artemis → Ares
  [0, 3], // Athena → Artemis
  [2, 5], // Apollo → Ares
];

const ARC_OFFSETS = [40, -35, 45, -30, 38, -42, 50, -28];
const ARC_DURATIONS = [12, 15, 10, 18, 14, 11, 20, 16];
const ARC_DELAYS = [0, 2, 4, 1, 6, 8, 3, 10];

function computeControlPoint(
  x1: number, y1: number,
  x2: number, y2: number,
  offset: number
) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  // Perpendicular offset
  const nx = -dy / len;
  const ny = dx / len;
  return { cx: mx + nx * offset, cy: my + ny * offset };
}

export function OrbitalThreads() {
  const positions = computeHexPositions(SIZE);

  const arcs = ARC_PAIRS.map(([a, b], i) => {
    const p1 = positions[a];
    const p2 = positions[b];
    const { cx, cy } = computeControlPoint(p1.x, p1.y, p2.x, p2.y, ARC_OFFSETS[i]);
    const d = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;

    // Approximate arc length for dash animation
    const chord = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const sag = Math.abs(ARC_OFFSETS[i]);
    const approxLength = chord + (2 * sag * sag) / (3 * chord); // rough approximation

    return {
      d,
      length: approxLength,
      duration: ARC_DURATIONS[i],
      delay: ARC_DELAYS[i],
      index: i,
    };
  });

  return (
    <div className="concept-inner" style={{ width: SIZE, height: SIZE, position: "relative" }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        {arcs.map((arc) => (
          <path
            key={`arc-${arc.index}`}
            d={arc.d}
            fill="none"
            stroke="var(--gold-divine)"
            strokeWidth={1.2}
            strokeDasharray={arc.length}
            strokeDashoffset={arc.length}
            className="orbital-trace"
            style={{
              animationDuration: `${arc.duration}s`,
              animationDelay: `${arc.delay}s`,
            }}
          />
        ))}
      </svg>

      {/* Deity icons */}
      {DEITIES.map((deity, i) => {
        const pos = positions[i];
        return (
          <div
            key={deity.name}
            className="concept-deity-mark"
            style={{
              position: "absolute",
              left: pos.x - MARK_SIZE / 2,
              top: pos.y - MARK_SIZE / 2,
            }}
            title={`${deity.name} — ${deity.domain}`}
          >
            <deity.Component size={MARK_SIZE} />
          </div>
        );
      })}
    </div>
  );
}
