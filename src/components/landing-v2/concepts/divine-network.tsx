"use client";

import { useEffect, useRef } from "react";
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

// Inbound dots — travel from outer nodes toward the center Pantheon node and absorb
const CENTER = SIZE / 2;
type InboundDot = {
  x1: number;
  y1: number;
  duration: number;
  delay: number;
  r: number;
  glow: boolean;
};

const inboundDots: InboundDot[] = [];
positions.forEach((pos, i) => {
  // Each outer node sends 2 inbound messages at staggered intervals
  for (let j = 0; j < 2; j++) {
    const seed = i * 71 + j * 137 + 500;
    inboundDots.push({
      x1: pos.x,
      y1: pos.y,
      duration: 2.0 + seededRandom(seed * 41) * 1.5,
      delay: seededRandom(seed * 43) * 10 + j * 5,
      r: 2.5 + seededRandom(seed * 47) * 1.5,
      glow: seededRandom(seed * 53) > 0.4,
    });
  }
});

/** Use the Web Animations API to animate SVG circles — works on all mobile browsers
 *  unlike CSS keyframes with var() custom properties. */
function useCircleAnimations(svgRef: React.RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const animations: Animation[] = [];

    // Animate message dots (travel between two nodes)
    svg.querySelectorAll<SVGCircleElement>("[data-dot]").forEach((el) => {
      const dx = Number(el.dataset.dx);
      const dy = Number(el.dataset.dy);
      const dur = Number(el.dataset.dur) * 1000;
      const del = Number(el.dataset.del) * 1000;

      const anim = el.animate(
        [
          { transform: "translate(0px, 0px)", opacity: 0 },
          { opacity: 0.7, offset: 0.05 },
          { opacity: 0.7, offset: 0.95 },
          { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 },
        ],
        { duration: dur, delay: del, iterations: Infinity, easing: "linear" }
      );
      animations.push(anim);
    });

    // Animate inbound dots (travel toward center and shrink)
    svg.querySelectorAll<SVGCircleElement>("[data-inbound]").forEach((el) => {
      const dx = Number(el.dataset.dx);
      const dy = Number(el.dataset.dy);
      const dur = Number(el.dataset.dur) * 1000;
      const del = Number(el.dataset.del) * 1000;

      const anim = el.animate(
        [
          { transform: "translate(0px, 0px) scale(1)", opacity: 0 },
          { opacity: 0.85, offset: 0.08 },
          { opacity: 0.7, transform: `translate(${dx * 0.75}px, ${dy * 0.75}px) scale(1)`, offset: 0.75 },
          { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 },
        ],
        { duration: dur, delay: del, iterations: Infinity, easing: "ease-in" }
      );
      animations.push(anim);
    });

    return () => {
      animations.forEach((a) => a.cancel());
    };
  }, [svgRef]);
}

export function DivineNetwork({ className }: { className?: string } = {}) {
  const svgRef = useRef<SVGSVGElement>(null);
  useCircleAnimations(svgRef);

  return (
    <div className={className ? `concept-inner ${className}` : "concept-inner"} style={{ width: SIZE, height: SIZE, position: "relative" }}>
      <svg
        ref={svgRef}
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

        {/* Message dots — animated via Web Animations API */}
        {messageDots.map((dot, i) => (
          <circle
            key={`dot-${i}`}
            cx={dot.x1}
            cy={dot.y1}
            r={dot.r}
            fill="var(--gold-active)"
            className={dot.glow ? "network-dot-glow" : undefined}
            opacity={0}
            data-dot=""
            data-dx={dot.x2 - dot.x1}
            data-dy={dot.y2 - dot.y1}
            data-dur={dot.duration}
            data-del={dot.delay}
          />
        ))}

        {/* Inbound dots — animated via Web Animations API */}
        {inboundDots.map((dot, i) => (
          <circle
            key={`inbound-${i}`}
            cx={dot.x1}
            cy={dot.y1}
            r={dot.r}
            fill="var(--gold-active)"
            className={dot.glow ? "network-dot-glow" : undefined}
            opacity={0}
            data-inbound=""
            data-dx={CENTER - dot.x1}
            data-dy={CENTER - dot.y1}
            data-dur={dot.duration}
            data-del={dot.delay}
          />
        ))}
      </svg>

      {/* Center Pantheon icon */}
      <div
        className="concept-deity-mark concept-center-icon"
        style={{
          position: "absolute",
          left: SIZE / 2 - 24,
          top: SIZE / 2 - 24,
        }}
        title="Pantheon — Command Center"
      >
        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          {/* Pediment (triangle) */}
          <path d="M3 10L12 3l9 7" />
          {/* Entablature */}
          <line x1="3" y1="10" x2="21" y2="10" />
          {/* Columns */}
          <line x1="6" y1="10" x2="6" y2="19" />
          <line x1="10" y1="10" x2="10" y2="19" />
          <line x1="14" y1="10" x2="14" y2="19" />
          <line x1="18" y1="10" x2="18" y2="19" />
          {/* Base / stylobate */}
          <line x1="2" y1="19" x2="22" y2="19" />
          <line x1="1.5" y1="21" x2="22.5" y2="21" />
        </svg>
      </div>

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
