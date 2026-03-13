"use client";

import { m } from "motion/react";
import { Diamond } from "lucide-react";
import { REVEAL_SLOW, STAGGER_DELAY } from "./motion-config";
import { AnimatedSection, SectionHeader } from "./animated-section";
import { AgentDossierCard } from "./panels/agent-dossier-card";
import { DashboardPanel } from "./panels/dashboard-panel";
import { AGENTS } from "./data/agents";

export function DivineRegistry() {
  return (
    <AnimatedSection id="team">
      <SectionHeader
        label="The Roster"
        title="One agent is an assistant. A council is an empire."
        subtitle="Begin with two. Scale to a full pantheon. Each agent receives a mandate — a role, a directive, and a domain."
      />
      <div className="v2-dossier-grid">
        {AGENTS.map((agent, i) => (
          <m.div
            key={agent.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...REVEAL_SLOW, delay: i * STAGGER_DELAY }}
          >
            <AgentDossierCard {...agent} />
          </m.div>
        ))}
      </div>

      <m.div
        className="v2-agent-callout"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={REVEAL_SLOW}
      >
        <Diamond size={18} className="v2-agent-callout-icon" />
        <p className="v2-agent-callout-text">
          These are examples. <strong>You define your own agents</strong> — custom names, roles, goals, and backstories tailored to your operation.
        </p>
      </m.div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ ...REVEAL_SLOW, delay: 0.1 }}
        style={{ maxWidth: 520, margin: "0 auto" }}
      >
        <DashboardPanel title="Agent Builder" meta="PREVIEW">
          <div className="v2-builder-preview">
            <div className="v2-builder-field">
              <span className="v2-builder-label">Role</span>
              <div className="v2-builder-input">Customer support specialist</div>
            </div>
            <div className="v2-builder-field">
              <span className="v2-builder-label">Goal</span>
              <div className="v2-builder-input">Resolve incoming tickets quickly and accurately while maintaining a friendly tone</div>
            </div>
            <div className="v2-builder-field">
              <span className="v2-builder-label">Backstory</span>
              <div className="v2-builder-input v2-builder-input-tall">Friendly and concise. References internal docs before escalating. Never makes promises about timelines.</div>
            </div>
          </div>
        </DashboardPanel>
      </m.div>
    </AnimatedSection>
  );
}
