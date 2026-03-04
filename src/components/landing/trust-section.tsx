"use client";

import { m, LazyMotion, domAnimation } from "motion/react";
import { Shield, Download, KeyRound } from "lucide-react";

const trustCards = [
  {
    icon: Shield,
    title: "Your data is walled off",
    body: "Every farm gets its own isolated data partition. Your grain bids, scale tickets, and conversations are never visible to other customers \u2014 not even accidentally. We enforce this at the database level, not just the application level.",
  },
  {
    icon: Download,
    title: "Export everything. Anytime.",
    body: "Your scale tickets, conversation history, and farm profile are yours. Export them as CSV or JSON from your dashboard whenever you want. If you cancel, your data stays available for 30 days to download.",
  },
  {
    icon: KeyRound,
    title: "Cancel in two clicks",
    body: "Monthly billing. No annual contracts. No setup fees. No cancellation fees. If FarmClaw doesn\u2019t save you time, cancel from your dashboard. We\u2019ll keep your data available for 30 days.",
  },
];

export function TrustSection() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="trust-section"
        id="trust"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <div>
          <div className="section-label">Your Data, Your Farm</div>
          <h2 className="section-title-display">Your neighbor can&apos;t see your bids. And we can&apos;t lock you in.</h2>
          <p className="section-sub">FarmClaw runs on shared infrastructure, but your data is completely isolated. Every query, every record, every conversation is separated at the database level.</p>
        </div>

        <div className="trust-grid">
          {trustCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <m.div
                key={card.title}
                className="trust-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <span className="trust-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>
              </m.div>
            );
          })}
        </div>
      </m.section>
    </LazyMotion>
  );
}
