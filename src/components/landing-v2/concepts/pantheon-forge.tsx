"use client";

import { DEITIES, computeHexPositions } from "./deity-positions";

const SIZE = 360;
const MARK_SIZE = 28;

export function PantheonForge() {
  const positions = computeHexPositions(SIZE);
  const center = SIZE / 2;

  return (
    <div className="concept-inner" style={{ width: SIZE, height: SIZE, position: "relative" }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        {/* Molten threads from each station to center */}
        {positions.map((pos, i) => {
          const dx = center - pos.x;
          const dy = center - pos.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          return (
            <line
              key={`thread-${i}`}
              x1={pos.x}
              y1={pos.y}
              x2={center}
              y2={center}
              stroke="var(--gold-divine)"
              strokeWidth={1.5}
              strokeDasharray={length}
              strokeDashoffset={length}
              className="forge-thread"
              style={{
                animationDelay: `${i * 1}s`,
                animationDuration: "6s",
              }}
            />
          );
        })}

        {/* Ember glow circles at each station */}
        {positions.map((pos, i) => (
          <circle
            key={`glow-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={20}
            fill="var(--gold-divine)"
            className="forge-breathe"
            style={{ animationDelay: `${i * 1}s` }}
          />
        ))}

        {/* Central nexus */}
        <circle
          cx={center}
          cy={center}
          r={18}
          fill="var(--gold-divine)"
          className="forge-nexus-outer"
          style={{ filter: "blur(4px)" }}
        />
        <circle
          cx={center}
          cy={center}
          r={8}
          fill="var(--gold-active)"
          className="forge-nexus-inner"
          style={{ filter: "blur(2px)" }}
        />
        <circle
          cx={center}
          cy={center}
          r={3}
          fill="var(--gold-active)"
          opacity={0.9}
        />
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
