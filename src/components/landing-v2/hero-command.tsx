"use client";

import { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation } from "motion/react";
import Link from "next/link";
import { BOOT_SEQUENCE, REVEAL_FAST, REVEAL_SLOW } from "./motion-config";
import { GridOverlay } from "./viz/grid-overlay";
import { DivineNetwork } from "./concepts/divine-network";

export function HeroCommand() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Boot sequence: 0=dark, 1=network appears, 2=status, 3=headline, 4=full
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <section className="v2-hero">
        <GridOverlay className="v2-hero-grid-overlay" />

        <div className="v2-hero-split">
          {/* Left: text content */}
          <div className="v2-hero-text">
            {/* Status readout */}
            <m.div
              className="v2-hero-status"
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : {}}
              transition={BOOT_SEQUENCE}
            >
              <span className="v2-hero-status-dot" />
              <span>{phase >= 2 ? "6 AGENTS ONLINE" : "INITIALIZING..."}</span>
            </m.div>

            {/* Headline */}
            <m.h1
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
              transition={REVEAL_FAST}
            >
              One mind cannot govern every domain.{" "}
              <span className="v2-headline-gold">Build the council that can.</span>
            </m.h1>

            {/* CTAs */}
            <m.div
              className="v2-hero-actions"
              initial={{ opacity: 0, y: 16 }}
              animate={phase >= 4 ? { opacity: 1, y: 0 } : {}}
              transition={REVEAL_SLOW}
            >
              <Link href="/signup" className="v2-btn-primary">Deploy Your Council</Link>
              <Link href="#skills" className="v2-btn-ghost">Review the Briefing</Link>
            </m.div>

            {/* Microcopy */}
            <m.p
              className="v2-hero-microcopy"
              initial={{ opacity: 0 }}
              animate={phase >= 4 ? { opacity: 1 } : {}}
              transition={{ ...REVEAL_SLOW, delay: 0.3 }}
            >
              Deploys into your Discord server in three minutes. No new app to learn.
            </m.p>
          </div>

          {/* Right: Divine Network visualization */}
          <m.div
            className="v2-hero-network"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
            transition={{ ...BOOT_SEQUENCE, duration: 1.2 }}
          >
            <DivineNetwork className="v2-hero-divine-network" />
          </m.div>
        </div>
      </section>
    </LazyMotion>
  );
}
