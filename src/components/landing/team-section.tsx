"use client";

import { useState } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";

const PERSONALITY_COLORS: Record<string, string> = {
  general: "var(--accent)",
  grain: "var(--green-bright)",
  weather: "#5865F2",
  "scale-tickets": "#7289da",
  ops: "var(--accent-light)",
};

const SKILL_LABELS: Record<string, string> = {
  "farm-grain-bids": "Grain Bids",
  "farm-weather": "Weather",
  "farm-scale-tickets": "Scale Tickets",
  "farm-tasks": "Tasks",
  "farm-sops": "SOPs",
};

const CHANNEL_MAP: Record<string, string[]> = {
  general: ["#general"],
  grain: ["#grain-bids"],
  weather: ["#weather"],
  "scale-tickets": ["#grain-bids"],
  ops: ["#operations"],
};

interface AgentConfig {
  display_name: string;
  personality_preset: string;
  skills: string[];
  cron_jobs: Record<string, boolean>;
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
    label: "2 Agents",
    agents: [
      { display_name: "Farm Assistant", personality_preset: "general", skills: ["farm-tasks", "farm-weather", "farm-grain-bids"], cron_jobs: { "morning-weather": true }, is_default: true },
      { display_name: "Operations Lead", personality_preset: "ops", skills: ["farm-tasks", "farm-sops"], cron_jobs: {}, is_default: false },
    ],
  },
  {
    id: "three-agent",
    label: "3 Agents",
    agents: [
      { display_name: "Farm Assistant", personality_preset: "general", skills: ["farm-tasks", "farm-weather"], cron_jobs: { "morning-weather": true }, is_default: true },
      { display_name: "Operations Lead", personality_preset: "ops", skills: ["farm-tasks", "farm-sops"], cron_jobs: {}, is_default: false },
      { display_name: "Grain Desk", personality_preset: "grain", skills: ["farm-grain-bids", "farm-scale-tickets"], cron_jobs: { "daily-grain-bids": true }, is_default: false },
    ],
  },
  {
    id: "four-agent",
    label: "Full Team",
    agents: [
      { display_name: "Farm Assistant", personality_preset: "general", skills: ["farm-tasks"], cron_jobs: {}, is_default: true },
      { display_name: "Operations Lead", personality_preset: "ops", skills: ["farm-tasks", "farm-sops"], cron_jobs: {}, is_default: false },
      { display_name: "Grain Desk", personality_preset: "grain", skills: ["farm-grain-bids"], cron_jobs: { "daily-grain-bids": true }, is_default: false },
      { display_name: "Weather Watch", personality_preset: "weather", skills: ["farm-weather"], cron_jobs: { "morning-weather": true }, is_default: false },
    ],
  },
];

const ALL_CHANNELS = ["#general", "#operations", "#grain-bids", "#weather"];

function getAgentChannels(agent: AgentConfig): string[] {
  if (agent.is_default) return ["#general"];
  return CHANNEL_MAP[agent.personality_preset] ?? [];
}

function getChannelAgent(channel: string, agents: AgentConfig[]): AgentConfig | undefined {
  for (const agent of agents) {
    if (!agent.is_default) {
      const channels = CHANNEL_MAP[agent.personality_preset] ?? [];
      if (channels.includes(channel)) return agent;
    }
  }
  return agents.find((a) => a.is_default);
}

const AGENT_COLORS = ["var(--accent)", "var(--green-bright)", "#5865F2", "#7289da"];

export function TeamSection() {
  const [activeTab, setActiveTab] = useState(0);
  const setup = SETUPS[activeTab];

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="team-section"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <div>
          <div className="section-label">Your Team, Your Way</div>
          <h2 className="section-title">Start simple. Add specialists when you&apos;re ready.</h2>
          <p className="section-sub">Every farm is different. Start with a single assistant or build a team of specialists — each with its own focus, skills, and Discord channel.</p>
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
                      style={{ background: PERSONALITY_COLORS[agent.personality_preset] ?? "var(--text-dim)" }}
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
                    {getAgentChannels(agent).map((ch) => (
                      <span key={ch} className="agent-channel">{ch}</span>
                    ))}
                    {agent.is_default && <span className="agent-channel dim">+ DMs</span>}
                  </div>
                </m.div>
              ))}
            </m.div>
          </AnimatePresence>

          <div className="team-discord">
            <div className="team-discord-header">Johnson Farms</div>
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
