"use client";

import { m, LazyMotion, domAnimation } from "motion/react";
import { REVEAL_SLOW } from "./motion-config";

export function Channels() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="channels-section"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={REVEAL_SLOW}
      >
        <h2 className="channels-headline">
          Stop routing everything<br />through your phone.<br />
          <span className="channels-headline-gold">Let your pantheon handle it.</span>
        </h2>

        <div className="channels-comparison">
          <div className="channels-compare-col">
            <div className="channels-compare-label">Before Pantheon</div>
            <p className="channels-compare-text">
              Every vendor email, employee question, and client deadline lands on your phone. You&apos;re the router for every piece of information in your business. Text threads, sticky notes, apps that don&apos;t talk to each other.
            </p>
          </div>
          <div className="channels-compare-divider" />
          <div className="channels-compare-col">
            <div className="channels-compare-label">After Pantheon</div>
            <p className="channels-compare-text">
              Each agent owns a domain. Operations in #operations. Research in #research. Client work in #client-projects. Your whole team gets access &mdash; no per-seat fees, no message limits. You make decisions instead of routing information.
            </p>
          </div>
        </div>
      </m.section>
    </LazyMotion>
  );
}
