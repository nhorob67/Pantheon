"use client";

import { useState, useEffect } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";
import { REVEAL_SLOW, STAGGER_DELAY } from "./motion-config";
import { Athena, Hermes, Ares, Apollo, Hephaestus, Artemis, StatusIndicator } from "./deity-marks";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
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
  const reduced = useReducedMotion();
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
          <div className="section-label">Your Team, Your Way</div>
          <h2 className="section-title-display">One agent is useful. A team of agents changes everything.</h2>
          <p className="section-sub">Start with a duo and grow to a full roster. Each agent gets its own role, skills, and channel — so the right specialist handles every question.</p>
        </div>

        <div className="roster-tabs" role="tablist" aria-label="Team configurations">
          {SETUPS.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={activeTab === i}
              aria-controls={`roster-panel-${s.id}`}
              tabIndex={activeTab === i ? 0 : -1}
              className={`roster-tab ${activeTab === i ? "active" : ""}`}
              onClick={() => setActiveTab(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") { e.preventDefault(); setActiveTab(Math.min(i + 1, SETUPS.length - 1)); }
                if (e.key === "ArrowLeft") { e.preventDefault(); setActiveTab(Math.max(i - 1, 0)); }
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="roster-table-container">
          <AnimatePresence mode="wait">
            <m.div
              key={setup.id}
              id={`roster-panel-${setup.id}`}
              role="tabpanel"
              aria-label={`${setup.label} configuration`}
              className="roster-table"
              initial={reduced ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.4 }}
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
                    initial={reduced ? undefined : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduced ? { duration: 0 } : { ...REVEAL_SLOW, delay: i * STAGGER_DELAY }}
                  >
                    <span className="roster-col-mark">
                      <Mark size={28} className="roster-mark" />
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
        </div>
      </m.section>
    </LazyMotion>
  );
}
