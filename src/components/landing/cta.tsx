"use client";

import Link from "next/link";
import { m, LazyMotion, domAnimation } from "motion/react";
import { REVEAL_SLOW } from "./motion-config";

export function FinalCTA() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="final-cta"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={REVEAL_SLOW}
      >
        <h2>Stop being every god<br /><span className="final-cta-em">on the mountain.</span></h2>
        <p>Three minutes to set up. Tomorrow morning, your first agent sends a briefing, your second tracks deadlines, and your third triages email. That&apos;s what a team looks like.</p>
        <div className="final-cta-trust">14 days free &middot; No credit card &middot; Cancel in two clicks</div>
        <Link href="/signup" className="cta-inscription">
          Start Free Trial
        </Link>
      </m.section>
    </LazyMotion>
  );
}
