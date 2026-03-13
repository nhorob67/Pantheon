"use client";

import Link from "next/link";
import { m } from "motion/react";
import { REVEAL_SLOW, STAGGER_DELAY } from "./motion-config";
import { AnimatedSection, SectionHeader } from "./animated-section";

const capabilities = [
  {
    heading: "Custom AI agents",
    detail: "Define each agent's role, goal, and backstory. Add as many as you need.",
  },
  {
    heading: "Discord workspace",
    detail: "A private server for your team with unlimited users. Bind agents to channels.",
  },
  {
    heading: "Daily briefings",
    detail: "Operations command with scheduled reports and proactive check-ins.",
  },
  {
    heading: "Knowledge base",
    detail: "Upload PDFs, DOCX, and contracts. Your agents learn your domain.",
  },
  {
    heading: "Persistent memory",
    detail: "Domain-specific memory that improves over time across every conversation.",
  },
  {
    heading: "Signal processing",
    detail: "Follow-up tracking, deadline monitoring, and renewal alerts.",
  },
  {
    heading: "Custom skills",
    detail: "Teach agents new capabilities with reusable, versioned skill protocols.",
  },
  {
    heading: "Agent delegation",
    detail: "Agents hand off tasks to each other automatically when the situation calls for it.",
  },
];

export function FormationsBoard() {
  return (
    <AnimatedSection id="pricing">
      <SectionHeader
        centered
        label="Capabilities"
        title="The cheapest hire on your team."
        subtitle="One plan. Every capability. Add agents as you grow."
      />

      <div className="v2-capabilities-grid">
        {capabilities.map((cap, i) => (
          <m.div
            key={cap.heading}
            className="v2-capability-item"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...REVEAL_SLOW, delay: i * STAGGER_DELAY }}
          >
            <div className="v2-capability-heading">{cap.heading}</div>
            <div className="v2-capability-detail">{cap.detail}</div>
          </m.div>
        ))}
      </div>

      <div className="v2-pricing-auth">
        <div className="v2-pricing-auth-header">Deployment Authorization</div>
        <div className="v2-pricing-auth-body">
          <div className="v2-pricing-amount">$50</div>
          <div className="v2-pricing-period">/month after trial</div>
          <p className="v2-pricing-note">
            $25 of operational capacity included. Most teams never exceed it.
            Overage billed in $20 blocks at month-end.
          </p>
          <Link href="/signup" className="v2-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Authorize Deployment
          </Link>
          <p className="v2-mono" style={{ marginTop: 12 }}>
            14-day trial. No credit card required.
          </p>
        </div>
      </div>

      <p className="v2-pricing-value">
        One missed signal. One expired contract. Any single failure costs more than a year of your team&apos;s service.
      </p>
    </AnimatedSection>
  );
}
