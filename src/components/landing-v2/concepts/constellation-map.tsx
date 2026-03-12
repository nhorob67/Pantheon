"use client";

import { DEITIES, computeHexPositions } from "./deity-positions";

const SIZE = 360;
const MARK_SIZE = 28;

export function ConstellationMap() {
  const positions = computeHexPositions(SIZE);

  // Adjacent edges (hexagon perimeter)
  const edges = positions.map((pos, i) => {
    const next = positions[(i + 1) % positions.length];
    const dx = next.x - pos.x;
    const dy = next.y - pos.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    return { x1: pos.x, y1: pos.y, x2: next.x, y2: next.y, length, index: i };
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
        {/* Draw-on lines */}
        {edges.map((e) => (
          <line
            key={`edge-${e.index}`}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="var(--gold-divine)"
            strokeWidth={1}
            opacity={0.4}
            strokeDasharray={e.length}
            strokeDashoffset={e.length}
            className="constellation-line"
            style={{ animationDelay: `${e.index * 0.25}s` }}
          />
        ))}

        {/* Cross lines (opposite pairs, first 3 only) */}
        {positions.slice(0, 3).map((pos, i) => {
          const opp = positions[i + 3];
          const dx = opp.x - pos.x;
          const dy = opp.y - pos.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          return (
            <line
              key={`cross-${i}`}
              x1={pos.x}
              y1={pos.y}
              x2={opp.x}
              y2={opp.y}
              stroke="var(--gold-divine)"
              strokeWidth={0.5}
              opacity={0.2}
              strokeDasharray={length}
              strokeDashoffset={length}
              className="constellation-line"
              style={{ animationDelay: `${1.5 + i * 0.3}s` }}
            />
          );
        })}

        {/* Traveling pulses along edges */}
        {edges.map((e) => (
          <circle
            key={`pulse-${e.index}`}
            r={3}
            fill="var(--gold-active)"
            opacity={0.7}
            className="constellation-pulse"
            style={{
              "--x1": `${e.x1}px`,
              "--y1": `${e.y1}px`,
              "--x2": `${e.x2}px`,
              "--y2": `${e.y2}px`,
              animationDuration: `${8 + e.index * 1.2}s`,
              animationDelay: `${2.5 + e.index * 0.8}s`,
            } as React.CSSProperties}
          />
        ))}

        {/* Node ripples */}
        {positions.map((pos, i) => (
          <circle
            key={`ripple-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={0}
            fill="none"
            stroke="var(--gold-divine)"
            strokeWidth={1}
            className="constellation-ripple"
            style={{
              animationDelay: `${i * 2.5}s`,
              animationDuration: `${10 + i * 1.5}s`,
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
