"use client";

import { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";
import { REVEAL_SLOW, STAGGER_DELAY } from "./motion-config";
import { Athena, Hermes, Ares, Apollo, Hephaestus, Artemis, StatusIndicator } from "./deity-marks";
import type { DeityMarkProps } from "./deity-marks";

interface AgentRow {
  name: string;
  mark: React.ComponentType<DeityMarkProps>;
  specialization: string;
  active: boolean;
  missions: string[];
}

interface Setup {
  id: string;
  label: string;
  agents: AgentRow[];
}

const SETUPS: Setup[] = [
  {
    id: "duo",
    label: "Duo",
    agents: [
      { name: "Athena", mark: Athena, specialization: "Executive operations", active: true, missions: ["Triaging morning inbox", "Preparing daily briefing", "Tracking vendor deadlines"] },
      { name: "Ares", mark: Ares, specialization: "Operations & SOPs", active: true, missions: ["Auditing onboarding checklist", "Updating safety protocols", "Reviewing compliance docs"] },
    ],
  },
  {
    id: "triad",
    label: "Triad",
    agents: [
      { name: "Athena", mark: Athena, specialization: "Executive operations", active: true, missions: ["Triaging morning inbox", "Preparing daily briefing", "Tracking vendor deadlines"] },
      { name: "Ares", mark: Ares, specialization: "Operations & SOPs", active: true, missions: ["Auditing onboarding checklist", "Updating safety protocols", "Reviewing compliance docs"] },
      { name: "Apollo", mark: Apollo, specialization: "Research & analysis", active: true, missions: ["Comparing vendor proposals", "Compiling market report", "Analyzing Q4 results"] },
    ],
  },
  {
    id: "full",
    label: "Full Pantheon",
    agents: [
      { name: "Athena", mark: Athena, specialization: "Executive operations", active: true, missions: ["Triaging morning inbox", "Preparing daily briefing", "Tracking vendor deadlines"] },
      { name: "Hermes", mark: Hermes, specialization: "Communications", active: true, missions: ["Drafting client proposal", "Following up with Lisa", "Scheduling team standup"] },
      { name: "Ares", mark: Ares, specialization: "Operations & SOPs", active: false, missions: ["Auditing onboarding checklist", "Updating safety protocols", "Reviewing compliance docs"] },
      { name: "Apollo", mark: Apollo, specialization: "Research & analysis", active: true, missions: ["Comparing vendor proposals", "Compiling market report", "Analyzing Q4 results"] },
      { name: "Hephaestus", mark: Hephaestus, specialization: "Skills & tooling", active: true, missions: ["Building custom SOP skill", "Testing email integration", "Deploying new workflow"] },
      { name: "Artemis", mark: Artemis, specialization: "Scheduling & tracking", active: true, missions: ["Monitoring contract renewals", "Sending deadline reminders", "Tracking project milestones"] },
    ],
  },
];

export function AgentRoster() {
  const [activeTab, setActiveTab] = useState(0);
  const [missionIndices, setMissionIndices] = useState<number[]>([]);
  const setup = SETUPS[activeTab];

  useEffect(() => {
    setMissionIndices(setup.agents.map(() => 0));
  }, [activeTab, setup.agents]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMissionIndices((prev) =>
        prev.map((idx, i) => (idx + 1) % (setup.agents[i]?.missions.length ?? 1))
      );
    }, 6000);
    return () => clearInterval(interval);
  }, [setup.agents]);

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="roster-section"
        id="team"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={REVEAL_SLOW}
      >
        <div>
          <div className="section-label">Every Pantheon Starts Somewhere</div>
          <h2 className="section-title-display">Assemble your pantheon.</h2>
          <p className="section-sub">One agent or six. A solo assistant or a full pantheon of specialists. Start with what you need and add new roles as your operation grows.</p>
        </div>

        <div className="roster-tabs">
          {SETUPS.map((s, i) => (
            <button key={s.id} className={`roster-tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i)}>
              {s.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={setup.id}
            className="roster-table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="roster-header-row">
              <span className="roster-col-mark" />
              <span className="roster-col-name">Agent</span>
              <span className="roster-col-spec">Specialization</span>
              <span className="roster-col-status">Status</span>
              <span className="roster-col-mission">Current Mission</span>
            </div>
            {setup.agents.map((agent, i) => {
              const Mark = agent.mark;
              return (
                <m.div
                  key={agent.name}
                  className="roster-row"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...REVEAL_SLOW, delay: i * STAGGER_DELAY }}
                >
                  <span className="roster-col-mark">
                    <Mark size={20} className="roster-mark" />
                  </span>
                  <span className="roster-col-name roster-agent-name">{agent.name}</span>
                  <span className="roster-col-spec">{agent.specialization}</span>
                  <span className="roster-col-status">
                    <StatusIndicator active={agent.active} />
                    <span className="roster-status-text">{agent.active ? "Active" : "Idle"}</span>
                  </span>
                  <span className="roster-col-mission">
                    <AnimatePresence mode="wait">
                      <m.span
                        key={missionIndices[i] ?? 0}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        {agent.missions[missionIndices[i] ?? 0]}
                      </m.span>
                    </AnimatePresence>
                  </span>
                </m.div>
              );
            })}
          </m.div>
        </AnimatePresence>
      </m.section>
    </LazyMotion>
  );
}
