"use client";

import Link from "next/link";
import { m, LazyMotion, domAnimation } from "motion/react";
import { REVEAL_SLOW } from "./motion-config";
import { DeityRing } from "./viz/deity-ring";
import { ParticleField } from "./viz/particle-field";

export function MissionLaunch() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="v2-mission-launch"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={REVEAL_SLOW}
      >
        <ParticleField />

        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ ...REVEAL_SLOW, duration: 1.4 }}
          style={{ marginBottom: 32 }}
        >
          <DeityRing size={240} markSize={24} />
        </m.div>

        <m.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...REVEAL_SLOW, delay: 0.3 }}
        >
          You have read the briefing.{" "}
          <span className="v2-headline-gold">Now deploy.</span>
        </m.h2>

        <m.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...REVEAL_SLOW, delay: 0.5 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
        >
          <Link href="/signup" className="v2-btn-primary">Deploy Free for 14 Days</Link>
          <p className="v2-hero-microcopy">
            Deploys into your Discord server in three minutes. No new app to learn.
          </p>
        </m.div>
      </m.section>
    </LazyMotion>
  );
}
