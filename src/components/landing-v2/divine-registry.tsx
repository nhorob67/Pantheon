"use client";

import { m } from "motion/react";
import { REVEAL_SLOW, STAGGER_DELAY } from "./motion-config";
import { AnimatedSection, SectionHeader } from "./animated-section";
import { AgentDossierCard } from "./panels/agent-dossier-card";
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
    </AnimatedSection>
  );
}
