"use client";

import { DEITIES, computeHexPositions } from "./deity-positions";

const SIZE = 360;
const MARK_SIZE = 28;

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const positions = computeHexPositions(SIZE);
const center = SIZE / 2;

// Build all route segments
type Segment = { x1: number; y1: number; x2: number; y2: number };

// Perimeter edges (6)
const perimeterEdges: Segment[] = positions.map((pos, i) => {
  const next = positions[(i + 1) % positions.length];
  return { x1: pos.x, y1: pos.y, x2: next.x, y2: next.y };
});

// Cross diagonals (3)
const diagonals: Segment[] = positions.slice(0, 3).map((pos, i) => {
  const opp = positions[i + 3];
  return { x1: pos.x, y1: pos.y, x2: opp.x, y2: opp.y };
});

// Hub spokes (6)
const spokes: Segment[] = positions.map((pos) => ({
  x1: pos.x,
  y1: pos.y,
  x2: center,
  y2: center,
}));

const allLines = [...perimeterEdges, ...diagonals, ...spokes];

// Build message dots
type MessageDot = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  duration: number;
  delay: number;
  r: number;
  glow: boolean;
};

const peerRoutes = [...perimeterEdges, ...diagonals];

function makeDot(seg: Segment, seed: number): MessageDot {
  const reverse = seededRandom(seed * 37) > 0.5;
  return {
    x1: reverse ? seg.x2 : seg.x1,
    y1: reverse ? seg.y2 : seg.y1,
    x2: reverse ? seg.x1 : seg.x2,
    y2: reverse ? seg.y1 : seg.y2,
    duration: 1.5 + seededRandom(seed * 41) * 2.5,
    delay: seededRandom(seed * 43) * 8,
    r: 2 + seededRandom(seed * 47) * 1.5,
    glow: seededRandom(seed * 53) > 0.6,
  };
}

const messageDots: MessageDot[] = [];

// One dot per spoke (6) — guarantees every hub route has traffic
spokes.forEach((spoke, i) => messageDots.push(makeDot(spoke, i + 100)));

// One dot per peer route (9) — guarantees every edge & diagonal has traffic
peerRoutes.forEach((route, i) => messageDots.push(makeDot(route, i + 200)));

export function DivineNetwork({ className }: { className?: string } = {}) {
  return (
    <div className={className ? `concept-inner ${className}` : "concept-inner"} style={{ width: SIZE, height: SIZE, position: "relative" }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        {/* Static lines — all routes at low opacity */}
        {allLines.map((seg, i) => (
          <line
            key={`line-${i}`}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            className="network-line"
          />
        ))}

        {/* Central nexus */}
        <circle
          cx={center}
          cy={center}
          r={16}
          fill="var(--gold-divine)"
          className="network-nexus-outer"
          style={{ filter: "blur(5px)" }}
        />
        <circle
          cx={center}
          cy={center}
          r={6}
          fill="var(--gold-active)"
          className="network-nexus-inner"
          style={{ filter: "blur(2px)" }}
        />
        <circle cx={center} cy={center} r={2.5} fill="var(--gold-active)" opacity={0.85} />

        {/* Node receive flashes */}
        {positions.map((pos, i) => (
          <circle
            key={`flash-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={18}
            fill="var(--gold-divine)"
            className="network-node-flash"
            style={{ animationDelay: `${i * 0.7}s`, animationDuration: `${3 + seededRandom(i * 83) * 2}s` }}
          />
        ))}

        {/* Message dots */}
        {messageDots.map((dot, i) => (
          <circle
            key={`dot-${i}`}
            r={dot.r}
            fill="var(--gold-active)"
            className={dot.glow ? "network-dot network-dot-glow" : "network-dot"}
            style={{
              "--x1": `${dot.x1}px`,
              "--y1": `${dot.y1}px`,
              "--x2": `${dot.x2}px`,
              "--y2": `${dot.y2}px`,
              animationDuration: `${dot.duration}s`,
              animationDelay: `${dot.delay}s`,
            } as React.CSSProperties}
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
