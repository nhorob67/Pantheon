"use client";

export function OnboardingBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Topographic contour lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] animate-[contour-drift_60s_linear_infinite]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="var(--accent)" strokeWidth="1">
          <ellipse cx="400" cy="350" rx="350" ry="200" />
          <ellipse cx="400" cy="350" rx="300" ry="170" />
          <ellipse cx="400" cy="350" rx="250" ry="140" />
          <ellipse cx="400" cy="350" rx="200" ry="110" />
          <ellipse cx="400" cy="350" rx="150" ry="80" />
          <ellipse cx="400" cy="350" rx="100" ry="50" />
          <ellipse cx="800" cy="500" rx="280" ry="160" />
          <ellipse cx="800" cy="500" rx="230" ry="130" />
          <ellipse cx="800" cy="500" rx="180" ry="100" />
          <ellipse cx="800" cy="500" rx="130" ry="70" />
          <ellipse cx="800" cy="500" rx="80" ry="40" />
          <ellipse cx="200" cy="650" rx="200" ry="120" />
          <ellipse cx="200" cy="650" rx="150" ry="90" />
          <ellipse cx="200" cy="650" rx="100" ry="60" />
          <ellipse cx="1000" cy="200" rx="250" ry="150" />
          <ellipse cx="1000" cy="200" rx="200" ry="120" />
          <ellipse cx="1000" cy="200" rx="150" ry="90" />
          <ellipse cx="1000" cy="200" rx="100" ry="60" />
        </g>
      </svg>

      {/* Ambient gradient glow */}
      <div className="absolute top-[-20%] left-[30%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(217,140,46,0.06)_0%,transparent_60%)] animate-[heroGlow_12s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(90,138,60,0.04)_0%,transparent_60%)]" />
    </div>
  );
}
