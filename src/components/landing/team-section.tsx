"use client";

import { useState } from "react";

const PERSONALITY_EMOJI: Record<string, string> = {
  general: "🌾",
  grain: "📊",
  weather: "⛅",
  "scale-tickets": "🧾",
};

const SKILL_LABELS: Record<string, string> = {
  "farm-grain-bids": "Grain Bids",
  "farm-weather": "Weather",
  "farm-scale-tickets": "Scale Tickets",
};

const CHANNEL_MAP: Record<string, string[]> = {
  general: ["#general"],
  grain: ["#grain-bids"],
  weather: ["#weather"],
  "scale-tickets": ["#scale-tickets"],
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
      { display_name: "Farm Assistant", personality_preset: "general", skills: ["farm-grain-bids", "farm-weather", "farm-scale-tickets"], cron_jobs: { "morning-weather": true }, is_default: true },
      { display_name: "Grain Desk", personality_preset: "grain", skills: ["farm-grain-bids"], cron_jobs: { "daily-grain-bids": true }, is_default: false },
    ],
  },
  {
    id: "three-agent",
    label: "3 Agents",
    agents: [
      { display_name: "Farm Assistant", personality_preset: "general", skills: ["farm-grain-bids", "farm-weather"], cron_jobs: { "morning-weather": true }, is_default: true },
      { display_name: "Grain Desk", personality_preset: "grain", skills: ["farm-grain-bids"], cron_jobs: { "daily-grain-bids": true }, is_default: false },
      { display_name: "Ticket Clerk", personality_preset: "scale-tickets", skills: ["farm-scale-tickets"], cron_jobs: {}, is_default: false },
    ],
  },
  {
    id: "four-agent",
    label: "Full Team",
    agents: [
      { display_name: "Farm Assistant", personality_preset: "general", skills: ["farm-grain-bids", "farm-scale-tickets"], cron_jobs: {}, is_default: true },
      { display_name: "Grain Desk", personality_preset: "grain", skills: ["farm-grain-bids"], cron_jobs: { "daily-grain-bids": true }, is_default: false },
      { display_name: "Weather Watch", personality_preset: "weather", skills: ["farm-weather"], cron_jobs: { "morning-weather": true }, is_default: false },
      { display_name: "Ticket Clerk", personality_preset: "scale-tickets", skills: ["farm-scale-tickets"], cron_jobs: {}, is_default: false },
    ],
  },
];

const ALL_CHANNELS = ["#general", "#grain-bids", "#weather", "#scale-tickets"];

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
  const defaultAgent = agents.find((a) => a.is_default);
  return defaultAgent;
}

const AGENT_COLORS = ["var(--accent)", "var(--green-bright)", "#5865F2", "#7289da"];

export function TeamSection() {
  const [activeTab, setActiveTab] = useState(0);
  const setup = SETUPS[activeTab];

  return (
    <section className="team-section">
      <div style={{ textAlign: "center" as const }}>
        <div className="section-label">Your Team, Your Way</div>
        <h2 className="section-title" style={{ margin: "0 auto" }}>Start simple. Add specialists when you&apos;re ready.</h2>
        <p className="section-sub" style={{ margin: "16px auto 0" }}>Every farm is different. Start with a single assistant that handles everything, or build a team of specialists — each with its own focus, skills, and Discord channel. You decide what your operation needs.</p>
      </div>

      <div className="team-tabs">
        {SETUPS.map((s, i) => (
          <button key={s.id} className={`team-tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="team-grid">
        <div className="team-agents" key={setup.id} style={{ animation: "fadeIn 0.4s ease" }}>
          {setup.agents.map((agent, i) => (
            <div key={agent.display_name} className="agent-card" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="agent-header">
                <span className="agent-emoji">{PERSONALITY_EMOJI[agent.personality_preset] ?? "🤖"}</span>
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
            </div>
          ))}
        </div>

        <div className="team-discord">
          <div className="team-discord-header">Johnson Farms</div>
          <div className="team-discord-channels">
            {ALL_CHANNELS.map((ch) => {
              const agent = getChannelAgent(ch, setup.agents);
              const agentIdx = agent ? setup.agents.indexOf(agent) : 0;
              const color = AGENT_COLORS[agentIdx] ?? "var(--text-dim)";
              return (
                <div key={ch} className="team-discord-channel">
                  <span className="team-discord-hash" style={{ color }}>#</span>
                  <span>{ch.replace("#", "")}</span>
                  {agent && <span className="team-discord-agent" style={{ color }}>{agent.display_name}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
