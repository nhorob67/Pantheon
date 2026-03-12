"use client";

const PARTICLE_COUNT = 25;

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function getParticleStyle(i: number): React.CSSProperties {
  const s = (n: number) => seededRandom(i * 6 + n);
  return {
    left: `${s(0) * 100}%`,
    bottom: `${-(s(1) * 20)}%`,
    ["--drift-duration" as string]: `${6 + s(2) * 8}s`,
    ["--drift-delay" as string]: `${s(3) * (6 + s(2) * 8)}s`,
    ["--drift-x" as string]: `${-30 + s(4) * 60}px`,
    width: `${1 + s(5) * 2}px`,
    height: `${1 + s(5) * 2}px`,
  };
}

const particleStyles = Array.from({ length: PARTICLE_COUNT }, (_, i) => getParticleStyle(i));

export function ParticleField({ className }: { className?: string }) {
  return (
    <div className={`v2-particle-field ${className ?? ""}`} aria-hidden="true">
      {particleStyles.map((style, i) => (
        <div key={i} className="v2-particle" style={style} />
      ))}
    </div>
  );
}
