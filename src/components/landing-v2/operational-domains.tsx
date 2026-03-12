"use client";

import { m } from "motion/react";
import { REVEAL_SLOW, STAGGER_FAST } from "./motion-config";
import { AnimatedSection, SectionHeader } from "./animated-section";
import { DashboardPanel } from "./panels/dashboard-panel";

const domains = [
  { title: "Operations Command", desc: "Task delegation, status tracking, daily briefings — managed by your council before you ask." },
  { title: "Protocol Library", desc: "SOPs, checklists, and procedures your agents reference and enforce consistently." },
  { title: "Signal Processing", desc: "Email triage, follow-up tracking, and response drafting across every inbox." },
  { title: "Field Intelligence", desc: "Research, analysis, and vendor comparisons assembled on demand." },
  { title: "Temporal Watch", desc: "Deadlines, renewals, and milestones monitored and surfaced before they expire." },
  { title: "Contact Registry", desc: "Communication history, follow-up status, and relationship context per contact." },
  { title: "Archive Analysis", desc: "PDF, DOCX, and contract processing with extraction and summarization." },
  { title: "Custom Protocols", desc: "Build any capability your operation requires. Teach your agents new skills." },
];

export function OperationalDomains() {
  return (
    <AnimatedSection>
      <SectionHeader label="Operational Domains" title="Each domain governed. Nothing unattended." />
      <div className="v2-domains-grid">
        {domains.map((domain, i) => (
          <m.div
            key={domain.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...REVEAL_SLOW, delay: i * STAGGER_FAST }}
          >
            <DashboardPanel title={domain.title}>
              <p className="v2-domain-desc">{domain.desc}</p>
            </DashboardPanel>
          </m.div>
        ))}
      </div>
    </AnimatedSection>
  );
}
