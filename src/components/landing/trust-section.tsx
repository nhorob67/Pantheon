"use client";

import { m, LazyMotion, domAnimation } from "motion/react";
import { REVEAL_SLOW, STAGGER_DELAY } from "./motion-config";
import { StatusIndicator } from "./deity-marks";

const trustCards = [
  {
    title: "Your data is walled off",
    body: "Every account gets its own isolated data partition. Your tasks, procedures, conversations, and documents are never visible to other customers, not even accidentally. We enforce this at the database level, not just the application level.",
  },
  {
    title: "Export everything. Anytime.",
    body: "Your task history, procedures, conversation history, and business profile are yours. Export them as CSV or JSON from your dashboard whenever you want. If you cancel, your data stays available for 30 days to download.",
  },
  {
    title: "Cancel in two clicks",
    body: "Monthly billing. No annual contracts. No setup fees. No cancellation fees. If Pantheon doesn\u2019t save you time, cancel from your dashboard. We\u2019ll keep your data available for 30 days.",
  },
];

export function TrustSection() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="trust-section"
        id="trust"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={REVEAL_SLOW}
      >
        <div>
          <div className="section-label">Your Data, Your Business</div>
          <h2 className="section-title-display">Your competitors can&apos;t see your data. And we can&apos;t lock you in.</h2>
          <p className="section-sub">Pantheon runs on shared infrastructure, but your data is completely isolated. Every query, every record, every conversation is separated at the database level.</p>
        </div>

        <div className="trust-grid">
          {trustCards.map((card, i) => (
            <m.div
              key={card.title}
              className="trust-card"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...REVEAL_SLOW, delay: i * STAGGER_DELAY }}
            >
              <span className="trust-icon">
                <StatusIndicator active />
              </span>
              <div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            </m.div>
          ))}
        </div>
      </m.section>
    </LazyMotion>
  );
}
