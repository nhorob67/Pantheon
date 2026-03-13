"use client";

import { DEITIES, computeHexPositions } from "./deity-positions";

const SIZE = 360;
const MARK_SIZE = 28;

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const positions = computeHexPositions(SIZE);
const N = positions.length;

// Build fully connected mesh — every node to every other node
type Segment = { x1: number; y1: number; x2: number; y2: number; hopDistance: number };

const allLines: Segment[] = [];
for (let i = 0; i < N; i++) {
  for (let j = i + 1; j < N; j++) {
    // Hop distance on the hexagon ring (1 = adjacent, 2 = one apart, 3 = opposite)
    const rawDist = Math.abs(i - j);
    const hopDistance = Math.min(rawDist, N - rawDist);
    allLines.push({
      x1: positions[i].x,
      y1: positions[i].y,
      x2: positions[j].x,
      y2: positions[j].y,
      hopDistance,
    });
  }
}

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

function makeDot(seg: Segment, seed: number, frequencyMultiplier: number): MessageDot {
  const reverse = seededRandom(seed * 37) > 0.5;
  return {
    x1: reverse ? seg.x2 : seg.x1,
    y1: reverse ? seg.y2 : seg.y1,
    x2: reverse ? seg.x1 : seg.x2,
    y2: reverse ? seg.y1 : seg.y2,
    // Longer duration + longer delay for distant connections = less frequent
    duration: (1.5 + seededRandom(seed * 41) * 2.5) * frequencyMultiplier,
    delay: seededRandom(seed * 43) * 8 * frequencyMultiplier,
    r: 2 + seededRandom(seed * 47) * 1.5,
    glow: seededRandom(seed * 53) > 0.6,
  };
}

const messageDots: MessageDot[] = [];

// Every edge gets a message dot; distant connections fire less often
allLines.forEach((seg, i) => {
  // Adjacent (hop 1) = normal speed, hop 2 = 2x slower, hop 3 (opposite) = 3x slower
  const frequencyMultiplier = seg.hopDistance;
  messageDots.push(makeDot(seg, i + 100, frequencyMultiplier));
  // Adjacent connections get a second dot for extra traffic
  if (seg.hopDistance === 1) {
    messageDots.push(makeDot(seg, i + 300, 1));
  }
});

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
        {/* Static lines — all node-to-node connections */}
        {allLines.map((seg, i) => (
          <line
            key={`line-${i}`}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            className="network-line"
            style={{ opacity: seg.hopDistance === 1 ? 0.14 : seg.hopDistance === 2 ? 0.08 : 0.05 }}
          />
        ))}

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
