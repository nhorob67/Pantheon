"use client";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { DEITIES, computeHexPositions } from "./deity-positions";

const SIZE = 360;
const MARK_SIZE = 28;
const CENTER = SIZE / 2;

type MotionProfile = {
  messageModulo: number;
  inboundModulo: number;
  durationMultiplier: number;
  opacityPeak: number;
  inboundOpacityPeak: number;
  allowGlow: boolean;
};

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

const positions = computeHexPositions(SIZE);
const N = positions.length;

type Segment = { x1: number; y1: number; x2: number; y2: number; hopDistance: number };

const allLines: Segment[] = [];
for (let i = 0; i < N; i++) {
  for (let j = i + 1; j < N; j++) {
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
    duration: (1.5 + seededRandom(seed * 41) * 2.5) * frequencyMultiplier,
    delay: seededRandom(seed * 43) * 8 * frequencyMultiplier,
    r: 2 + seededRandom(seed * 47) * 1.5,
    glow: seededRandom(seed * 53) > 0.6,
  };
}

const messageDots: MessageDot[] = [];
allLines.forEach((seg, i) => {
  const frequencyMultiplier = seg.hopDistance;
  messageDots.push(makeDot(seg, i + 100, frequencyMultiplier));
  if (seg.hopDistance === 1) {
    messageDots.push(makeDot(seg, i + 300, 1));
  }
});

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

function getMotionProfile(prefersReducedMotion: boolean): MotionProfile {
  if (prefersReducedMotion) {
    return {
      messageModulo: 3,
      inboundModulo: 2,
      durationMultiplier: 1.8,
      opacityPeak: 0.3,
      inboundOpacityPeak: 0.35,
      allowGlow: false,
    };
  }

  return {
    messageModulo: 1,
    inboundModulo: 1,
    durationMultiplier: 1,
    opacityPeak: 0.7,
    inboundOpacityPeak: 0.85,
    allowGlow: true,
  };
}

function TravelDot({
  dot,
  profile,
}: {
  dot: MessageDot;
  profile: MotionProfile;
}) {
  const duration = dot.duration * profile.durationMultiplier;
  const peakOpacity = profile.opacityPeak;
  const glowClass = profile.allowGlow && dot.glow ? "network-dot-glow" : undefined;

  return (
    <g transform={`translate(${dot.x1} ${dot.y1})`}>
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`0 0; ${dot.x2 - dot.x1} ${dot.y2 - dot.y1}`}
          keyTimes="0;1"
          dur={`${duration}s`}
          begin={`${dot.delay}s`}
          repeatCount="indefinite"
        />
        <circle
          cx={0}
          cy={0}
          r={dot.r}
          fill="var(--gold-active)"
          className={glowClass}
          opacity={0}
        >
          <animate
            attributeName="opacity"
            values={`0;${peakOpacity};${peakOpacity};0`}
            keyTimes="0;0.05;0.95;1"
            dur={`${duration}s`}
            begin={`${dot.delay}s`}
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </g>
  );
}

function InboundTravelDot({
  dot,
  profile,
}: {
  dot: InboundDot;
  profile: MotionProfile;
}) {
  const duration = dot.duration * profile.durationMultiplier;
  const peakOpacity = profile.inboundOpacityPeak;
  const glowClass = profile.allowGlow && dot.glow ? "network-dot-glow" : undefined;
  const dx = CENTER - dot.x1;
  const dy = CENTER - dot.y1;

  return (
    <g transform={`translate(${dot.x1} ${dot.y1})`}>
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`0 0; ${dx * 0.75} ${dy * 0.75}; ${dx} ${dy}`}
          keyTimes="0;0.75;1"
          dur={`${duration}s`}
          begin={`${dot.delay}s`}
          repeatCount="indefinite"
        />
        <g>
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1;1;0"
            keyTimes="0;0.75;1"
            dur={`${duration}s`}
            begin={`${dot.delay}s`}
            repeatCount="indefinite"
          />
          <circle
            cx={0}
            cy={0}
            r={dot.r}
            fill="var(--gold-active)"
            className={glowClass}
            opacity={0}
          >
            <animate
              attributeName="opacity"
              values={`0;${peakOpacity};${peakOpacity * 0.82};0`}
              keyTimes="0;0.08;0.75;1"
              dur={`${duration}s`}
              begin={`${dot.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </g>
    </g>
  );
}

export function DivineNetwork({ className }: { className?: string } = {}) {
  const prefersReducedMotion = useReducedMotion();
  const motionProfile = getMotionProfile(prefersReducedMotion);
  const visibleMessageDots = messageDots.flatMap((dot, index) =>
    index % motionProfile.messageModulo === 0 ? [{ dot, index }] : []
  );
  const visibleInboundDots = inboundDots.flatMap((dot, index) =>
    index % motionProfile.inboundModulo === 0 ? [{ dot, index }] : []
  );

  return (
    <div
      className={className ? `concept-inner ${className}` : "concept-inner"}
      style={{ width: SIZE, height: SIZE, position: "relative" }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
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

        {visibleMessageDots.map(({ dot, index }) => (
          <TravelDot key={`dot-${index}`} dot={dot} profile={motionProfile} />
        ))}

        {visibleInboundDots.map(({ dot, index }) => (
          <InboundTravelDot key={`inbound-${index}`} dot={dot} profile={motionProfile} />
        ))}
      </svg>

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
          <path d="M3 10L12 3l9 7" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="6" y1="10" x2="6" y2="19" />
          <line x1="10" y1="10" x2="10" y2="19" />
          <line x1="14" y1="10" x2="14" y2="19" />
          <line x1="18" y1="10" x2="18" y2="19" />
          <line x1="2" y1="19" x2="22" y2="19" />
          <line x1="1.5" y1="21" x2="22.5" y2="21" />
        </svg>
      </div>

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
