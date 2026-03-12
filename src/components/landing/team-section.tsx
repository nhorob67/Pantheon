"use client";

import { useState } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";

const SKILL_LABELS: Record<string, string> = {
  tasks: "Tasks",
  email: "Email",
  research: "Research",
  sops: "SOPs",
  scheduling: "Scheduling",
  documents: "Documents",
  followups: "Follow-ups",
};

interface AgentConfig {
  display_name: string;
  role: string;
  channel: string;
  skills: string[];
  is_default: boolean;
}

interface Setup {
  id: string;
  label: string;
  agents: AgentConfig[];
}

const SETUPS: Setup[] = [
  {
    id: "two-agent",
    label: "Duo",
    agents: [
      { display_name: "Executive Assistant", role: "General operations assistant", channel: "#general", skills: ["tasks", "email", "scheduling"], is_default: true },
      { display_name: "Operations Lead", role: "Operations lead", channel: "#operations", skills: ["tasks", "sops", "documents"], is_default: false },
    ],
  },
  {
    id: "three-agent",
    label: "Triad",
    agents: [
      { display_name: "Executive Assistant", role: "General operations assistant", channel: "#general", skills: ["tasks", "email", "scheduling"], is_default: true },
      { display_name: "Operations Lead", role: "Operations lead", channel: "#operations", skills: ["tasks", "sops", "documents"], is_default: false },
      { display_name: "Research Analyst", role: "Research analyst", channel: "#research", skills: ["research", "documents", "followups"], is_default: false },
    ],
  },
  {
    id: "four-agent",
    label: "Full Pantheon",
    agents: [
      { display_name: "Executive Assistant", role: "General operations assistant", channel: "#general", skills: ["tasks", "scheduling"], is_default: true },
      { display_name: "Operations Lead", role: "Operations lead", channel: "#operations", skills: ["tasks", "sops", "documents"], is_default: false },
      { display_name: "Research Analyst", role: "Research analyst", channel: "#research", skills: ["research", "documents"], is_default: false },
      { display_name: "Comms Manager", role: "Communications manager", channel: "#comms", skills: ["email", "followups", "scheduling"], is_default: false },
    ],
  },
];

const ALL_CHANNELS = ["#general", "#operations", "#research", "#comms"];
const AGENT_COLORS = ["var(--accent)", "var(--green-bright)", "#5865F2", "var(--accent-light)"];

function getChannelAgent(channel: string, agents: AgentConfig[]): AgentConfig | undefined {
  const bound = agents.find((a) => !a.is_default && a.channel === channel);
  if (bound) return bound;
  return agents.find((a) => a.is_default);
}

export function TeamSection() {
  const [activeTab, setActiveTab] = useState(0);
  const setup = SETUPS[activeTab];

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="team-section"
        id="team"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <div>
          <div className="section-label">Every Pantheon Starts Somewhere</div>
          <h2 className="section-title">Start simple. Add specialists when you&apos;re ready.</h2>
          <p className="section-sub">One agent or four. A solo assistant or a full pantheon of specialists. Start with what you need and add new roles as your operation grows.</p>
        </div>

        <div className="team-tabs">
          {SETUPS.map((s, i) => (
            <button key={s.id} className={`team-tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="team-grid">
          <AnimatePresence mode="wait">
            <m.div
              key={setup.id}
              className="team-agents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {setup.agents.map((agent, i) => (
                <m.div
                  key={agent.display_name}
                  className={`agent-card ${agent.is_default ? "default-agent" : ""}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.08 }}
                >
                  <div className="agent-header">
                    <span
                      className="agent-dot"
                      style={{ background: AGENT_COLORS[i] ?? "var(--text-dim)" }}
                    />
                    <span className="agent-name">{agent.display_name}</span>
                    {agent.is_default && <span className="agent-default-badge">DEFAULT</span>}
                  </div>
                  <div className="agent-skills">
                    {agent.skills.map((skill) => (
                      <span key={skill} className="agent-skill-badge">{SKILL_LABELS[skill] ?? skill}</span>
                    ))}
                  </div>
                  <div className="agent-channels">
                    <span className="agent-channel">{agent.channel}</span>
                    {agent.is_default && <span className="agent-channel dim">+ DMs</span>}
                  </div>
                </m.div>
              ))}
            </m.div>
          </AnimatePresence>

          <div className="team-discord">
            <div className="team-discord-header">Acme Corp</div>
            <div className="team-discord-channels">
              <AnimatePresence mode="wait">
                {ALL_CHANNELS.map((ch) => {
                  const agent = getChannelAgent(ch, setup.agents);
                  const agentIdx = agent ? setup.agents.indexOf(agent) : 0;
                  const color = AGENT_COLORS[agentIdx] ?? "var(--text-dim)";
                  return (
                    <m.div
                      key={`${setup.id}-${ch}`}
                      className="team-discord-channel"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="team-discord-hash" style={{ color }}>#</span>
                      <span>{ch.replace("#", "")}</span>
                      {agent && <span className="team-discord-agent" style={{ color }}>{agent.display_name}</span>}
                    </m.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </m.section>
    </LazyMotion>
  );
}
