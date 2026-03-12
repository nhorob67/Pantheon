"use client";

import Link from "next/link";
import { m } from "motion/react";
import { REVEAL_SLOW, STAGGER_DELAY } from "./motion-config";
import { AnimatedSection, SectionHeader } from "./animated-section";
import { Athena, Hermes, Ares, Apollo, Hephaestus, Artemis } from "./deity-marks";
import type { DeityMarkProps } from "./deity-marks";

interface Formation {
  name: string;
  desc: string;
  marks: React.ComponentType<DeityMarkProps>[];
  features: string[];
}

const formations: Formation[] = [
  {
    name: "Vanguard",
    desc: "1–2 agents",
    marks: [Athena, Ares],
    features: [
      "Your pantheon, assembled for your operation",
      "$25/mo AI usage included — most councils stay under",
      "Discord for your team, unlimited users",
      "Operations command and daily briefings",
      "Signal processing and follow-up tracking",
      "Protocol library and procedure checklists",
    ],
  },
  {
    name: "Council",
    desc: "3 agents",
    marks: [Athena, Hermes, Apollo],
    features: [
      "Everything in Vanguard",
      "Field intelligence and research on demand",
      "Archive analysis (PDF, DOCX, contracts)",
      "Contact registry across all channels",
      "Domain-specific memory that improves over time",
    ],
  },
  {
    name: "Full Pantheon",
    desc: "4+ agents",
    marks: [Athena, Hermes, Ares, Apollo, Hephaestus, Artemis],
    features: [
      "Everything in Council",
      "Temporal watch — deadline and renewal tracking",
      "Custom protocols and integrations",
      "Agent delegation and collaboration",
      "Priority support",
      "New capabilities deployed automatically",
    ],
  },
];

export function FormationsBoard() {
  return (
    <AnimatedSection id="pricing">
      <SectionHeader centered label="Formations" title="The cheapest hire on your team." />

      <div className="v2-formations">
        {formations.map((f, i) => (
          <m.div
            key={f.name}
            className="v2-formation-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...REVEAL_SLOW, delay: i * STAGGER_DELAY }}
          >
            <div className="v2-formation-marks">
              {f.marks.map((Mark, j) => <Mark key={j} size={24} />)}
            </div>
            <div className="v2-formation-name">{f.name}</div>
            <div className="v2-formation-desc">{f.desc}</div>
            <ul className="v2-formation-features">
              {f.features.map((feat) => <li key={feat}>{feat}</li>)}
            </ul>
          </m.div>
        ))}
      </div>

      <div className="v2-pricing-auth">
        <div className="v2-pricing-auth-header">Deployment Authorization</div>
        <div className="v2-pricing-auth-body">
          <div className="v2-pricing-amount">$50</div>
          <div className="v2-pricing-period">/month after trial</div>
          <p className="v2-pricing-note">
            $25 of operational capacity included. Most councils never exceed it.
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
        One missed signal. One expired contract. Any single failure costs more than a year of your council&apos;s service.
      </p>
    </AnimatedSection>
  );
}
