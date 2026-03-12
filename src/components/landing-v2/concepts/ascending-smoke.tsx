"use client";

import { DEITIES, computeHexPositions } from "./deity-positions";

const SIZE = 360;
const MARK_SIZE = 28;
const PARTICLE_COUNT = 35;

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  startX: seededRandom(i * 3) * 100,
  drift: (seededRandom(i * 7) - 0.5) * 60,
  size: 2 + seededRandom(i * 11) * 4,
  delay: seededRandom(i * 13) * 10,
  duration: 6 + seededRandom(i * 17) * 8,
  blur: 1 + seededRandom(i * 19) * 3,
  opacity: 0.3 + seededRandom(i * 23) * 0.5,
}));

export function AscendingSmoke() {
  const positions = computeHexPositions(SIZE);

  return (
    <div className="concept-inner smoke-container" style={{ width: SIZE, height: SIZE, position: "relative" }}>
      {/* Particle layer */}
      <div className="smoke-particles" aria-hidden="true">
        {particles.map((p, i) => (
          <div
            key={i}
            className="smoke-particle"
            style={{
              "--start-x": `${p.startX}%`,
              "--drift": `${p.drift}px`,
              "--size": `${p.size}px`,
              "--delay": `${p.delay}s`,
              "--duration": `${p.duration}s`,
              "--blur": `${p.blur}px`,
              "--peak-opacity": p.opacity,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Deity icons — shifted slightly lower with float animation */}
      {DEITIES.map((deity, i) => {
        const pos = positions[i];
        return (
          <div
            key={deity.name}
            className="concept-deity-mark smoke-deity-float"
            style={{
              position: "absolute",
              left: pos.x - MARK_SIZE / 2,
              top: pos.y - MARK_SIZE / 2 + 20,
              animationDelay: `${i * 0.8}s`,
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
