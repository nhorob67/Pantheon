"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { m, AnimatePresence } from "motion/react";
import { AnimatedSection, SectionHeader } from "./animated-section";
import { DashboardPanel } from "./panels/dashboard-panel";
import { AGENTS } from "./data/agents";

interface ConversationFrame {
  type: "user" | "assistant";
  text: string;
  richContent?: React.ReactNode;
  delay: number;
}

const eventFeed = [
  "Athena triaged 3 emails",
  "Hermes drafted proposal for Meridian Group",
  "Apollo compiled vendor comparison",
  "Artemis flagged contract renewal — due Friday",
  "Athena prepared daily briefing",
  "Hephaestus deployed new SOP skill",
  "Hermes scheduled team standup",
  "Apollo analyzed Q4 results",
  "Ares updated safety protocols",
  "Artemis sent deadline reminder to Dave",
  "Athena tracked vendor deadlines",
  "Hermes followed up with Lisa on tax docs",
];

const scenarios: { label: string; frames: ConversationFrame[] }[] = [
  {
    label: "Daily Briefing",
    frames: [
      { type: "user", text: "What's on my plate today?", delay: 0 },
      {
        type: "assistant",
        text: "Today's Task Board, Mar 3",
        delay: 600,
        richContent: (
          <div className="v2-showcase-table">
            <div className="v2-showcase-table-grid v2-showcase-table-grid-3">
              <div className="v2-showcase-col-header">Task</div>
              <div className="v2-showcase-col-header">Priority</div>
              <div className="v2-showcase-col-header">Status</div>
              <div className="v2-showcase-cell-primary">Q1 budget review</div>
              <div className="v2-showcase-cell-secondary">HIGH</div>
              <div><span className="v2-response-tag good">READY</span></div>
              <div className="v2-showcase-cell-primary">Client proposal — Meridian Group</div>
              <div className="v2-showcase-cell-secondary">MED</div>
              <div className="v2-showcase-cell-secondary">2:00 PM</div>
              <div className="v2-showcase-cell-primary">Vendor contract renewal</div>
              <div className="v2-showcase-cell-secondary">MED</div>
              <div><span className="v2-response-tag caution">DUE FRI</span></div>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "I'd focus on the vendor contract first — it expires Friday and needs sign-off. Budget review is prepped and ready for 10 AM.", delay: 400 },
    ],
  },
  {
    label: "Standing Orders",
    frames: [
      { type: "user", text: "Walk me through new employee onboarding", delay: 0 },
      {
        type: "assistant",
        text: "New Employee Onboarding Protocol",
        delay: 600,
        richContent: (
          <div className="v2-showcase-list">
            <div className="v2-showcase-list-item">
              <span className="v2-showcase-list-num">1.</span>
              <span className="v2-showcase-list-text">IT setup: laptop, email, software access</span>
              <span className="v2-response-tag bad">REQUIRED</span>
            </div>
            <div className="v2-showcase-list-item">
              <span className="v2-showcase-list-num">2.</span>
              <span className="v2-showcase-list-text">HR paperwork and benefits enrollment</span>
              <span className="v2-response-tag bad">REQUIRED</span>
            </div>
            <div className="v2-showcase-list-item">
              <span className="v2-showcase-list-num">3.</span>
              <span className="v2-showcase-list-text">Team introductions and org chart walkthrough</span>
              <span className="v2-response-tag good">SCHEDULED</span>
            </div>
            <div className="v2-showcase-list-item">
              <span className="v2-showcase-list-num">4.</span>
              <span className="v2-showcase-list-text">Project orientation and tool training</span>
              <span className="v2-response-tag caution">WEEK 1</span>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "Sarah's start date is Monday. IT setup is in progress and HR paperwork was sent yesterday.", delay: 400 },
    ],
  },
  {
    label: "Field Intelligence",
    frames: [
      { type: "user", text: "Compare the proposals from our three vendors", delay: 0 },
      {
        type: "assistant",
        text: "Vendor Comparison: Cloud Infrastructure",
        delay: 600,
        richContent: (
          <div className="v2-showcase-list">
            <div className="v2-showcase-list-item">
              <span className="v2-showcase-list-vendor">Vendor A</span>
              <span className="v2-showcase-list-text">$4,200/mo · 99.9% SLA · 24/7 support</span>
              <span className="v2-response-tag good">BEST VALUE</span>
            </div>
            <div className="v2-showcase-list-item">
              <span className="v2-showcase-list-vendor">Vendor B</span>
              <span className="v2-showcase-list-text">$3,800/mo · 99.5% SLA · Business hours</span>
              <span className="v2-response-tag caution">CHEAPEST</span>
            </div>
            <div className="v2-showcase-list-item">
              <span className="v2-showcase-list-vendor">Vendor C</span>
              <span className="v2-showcase-list-text">$5,100/mo · 99.99% SLA · Dedicated rep</span>
              <span className="v2-response-tag bad">PREMIUM</span>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "Vendor A gives the best balance of cost and reliability. Vendor B saves $400/mo but cuts support hours in half.", delay: 400 },
    ],
  },
  {
    label: "Signal Intercept",
    frames: [
      { type: "user", text: "Who do I still need to get back to?", delay: 0 },
      {
        type: "assistant",
        text: "Open Signals: This Week",
        delay: 600,
        richContent: (
          <div className="v2-showcase-table">
            <div className="v2-showcase-table-grid v2-showcase-table-grid-3alt">
              <div className="v2-showcase-col-header">Contact</div>
              <div className="v2-showcase-col-header">Signal</div>
              <div className="v2-showcase-col-header">Status</div>
              <div className="v2-showcase-cell-primary">Lisa (accountant)</div>
              <div className="v2-showcase-cell-secondary">Q1 tax documents</div>
              <div><span className="v2-response-tag bad">DUE WED</span></div>
              <div className="v2-showcase-cell-primary">Meridian Group</div>
              <div className="v2-showcase-cell-secondary">Partnership proposal</div>
              <div><span className="v2-response-tag caution">WAITING</span></div>
              <div className="v2-showcase-cell-primary">Dave (contractor)</div>
              <div className="v2-showcase-cell-secondary">Project timeline</div>
              <div><span className="v2-response-tag caution">WAITING</span></div>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "The tax documents for Lisa are the most time-sensitive — she needs them by Wednesday. The Meridian proposal has been waiting since last week.", delay: 400 },
    ],
  },
  {
    label: "Council Records",
    frames: [
      { type: "user", text: "What did we decide in last week's team meeting?", delay: 0 },
      {
        type: "assistant",
        text: "Council Summary: Feb 28",
        delay: 600,
        richContent: (
          <div className="v2-showcase-table">
            <div className="v2-showcase-table-grid v2-showcase-table-grid-3alt">
              <div className="v2-showcase-col-header">Decision</div>
              <div className="v2-showcase-col-header">Owner</div>
              <div className="v2-showcase-col-header">Due</div>
              <div className="v2-showcase-cell-primary">Switch to Vendor A for hosting</div>
              <div className="v2-showcase-cell-secondary">You</div>
              <div><span className="v2-response-tag caution">MAR 7</span></div>
              <div className="v2-showcase-cell-primary">Hire second contractor for Q2</div>
              <div className="v2-showcase-cell-secondary">Dave</div>
              <div><span className="v2-response-tag good">IN PROGRESS</span></div>
              <div className="v2-showcase-cell-primary">Update client SLA templates</div>
              <div className="v2-showcase-cell-secondary">Sarah</div>
              <div><span className="v2-response-tag bad">OVERDUE</span></div>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "Three directives. The vendor switch is on you — deadline is Friday. Dave started the contractor search. Sarah's SLA update is overdue.", delay: 400 },
    ],
  },
];

function ProgressiveText({ text, mode, speed, onDone }: {
  text: string;
  mode: "word" | "char";
  speed: number;
  onDone?: () => void;
}) {
  const [count, setCount] = useState(0);
  const units = mode === "word" ? text.split(" ") : text.split("");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const unitCount = units.length;

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCount(i);
      if (i >= unitCount) {
        clearInterval(interval);
        if (mode === "char") {
          setTimeout(() => onDoneRef.current?.(), 300);
        } else {
          onDoneRef.current?.();
        }
      }
    }, speed);
    return () => clearInterval(interval);
  }, [unitCount, speed, mode]);

  const displayed = mode === "word"
    ? units.slice(0, count).join(" ")
    : text.slice(0, count);

  return (
    <>
      {displayed}
      {count < unitCount && <span className="v2-stream-cursor" />}
    </>
  );
}

function ScenarioPlayer({ frames, scenarioKey }: { frames: ConversationFrame[]; scenarioKey: string }) {
  const [visibleFrames, setVisibleFrames] = useState<number[]>([]);
  const [currentStreaming, setCurrentStreaming] = useState(-1);
  const [showRich, setShowRich] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const advanceFrame = useCallback((idx: number) => {
    if (idx >= frames.length) return;
    const frame = frames[idx];
    const delay = idx === 0 ? 200 : frame.delay;
    timerRef.current.push(setTimeout(() => {
      setVisibleFrames((prev) => [...prev, idx]);
      setCurrentStreaming(idx);
    }, delay));
  }, [frames]);

  useEffect(() => {
    advanceFrame(0);
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timerRef.current.forEach(clearTimeout);
    };
  }, [advanceFrame]);

  const handleFrameDone = useCallback((idx: number) => {
    const frame = frames[idx];
    if (frame.richContent) {
      setShowRich((prev) => new Set(prev).add(idx));
    }
    setCurrentStreaming(-1);
    advanceFrame(idx + 1);
  }, [frames, advanceFrame]);

  return (
    <div className="v2-terminal-body">
      {visibleFrames.map((idx) => {
        const frame = frames[idx];
        if (frame.type === "user") {
          return (
            <div key={`${scenarioKey}-${idx}`} className="v2-terminal-user">
              <span className="prompt">&gt;</span>
              <span className="text">
                <ProgressiveText text={frame.text} mode="char" speed={45} onDone={() => handleFrameDone(idx)} />
              </span>
            </div>
          );
        }
        return (
          <div key={`${scenarioKey}-${idx}`} className="v2-terminal-response">
            {currentStreaming === idx ? (
              <strong><ProgressiveText text={frame.text} mode="word" speed={40} onDone={() => handleFrameDone(idx)} /></strong>
            ) : (
              <strong>{frame.text}</strong>
            )}
            {showRich.has(idx) && frame.richContent}
          </div>
        );
      })}
      {visibleFrames.length > 0 && currentStreaming === -1 && visibleFrames.length < frames.length && (
        <div className="v2-typing-indicator"><span /><span /><span /></div>
      )}
    </div>
  );
}

function AgentStatusPanel() {
  const [activityIdx, setActivityIdx] = useState<number[]>(AGENTS.map(() => 0));

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityIdx((prev) => prev.map((idx, i) => (idx + 1) % AGENTS[i].missions.length));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardPanel title="Agent Status" meta="6 AGENTS">
      <div className="v2-ops-agents-list">
        {AGENTS.map((agent, i) => {
          const Mark = agent.mark;
          return (
            <div key={agent.name} className="v2-ops-agent-row">
              <span className="v2-ops-agent-mark"><Mark size={18} /></span>
              <div className="v2-ops-agent-info">
                <div className="v2-ops-agent-name">{agent.name}</div>
                <div className="v2-ops-agent-activity">{agent.missions[activityIdx[i]]}</div>
              </div>
              <span className={`v2-ops-agent-dot ${agent.active ? "active" : "idle"}`} />
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}

function TelemetryPanel() {
  return (
    <DashboardPanel title="Telemetry" meta="LIVE">
      <div className="v2-event-feed">
        {eventFeed.map((event, i) => (
          <div key={i} className="v2-event-item">
            <span className="v2-event-time">
              {String(8 + Math.floor(i / 3)).padStart(2, "0")}:{String((i * 17) % 60).padStart(2, "0")}
            </span>
            <span className="v2-event-text">{event}</span>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

export function OperationsConsole() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <AnimatedSection id="skills">
      <SectionHeader label="Field Operations" title="Your council reports. You command." />

      <div className="v2-ops-console">
        <AgentStatusPanel />

        <DashboardPanel title="Command Interface" meta="OPERATIONAL">
          <div className="v2-terminal-telemetry">
            <span>TOKENS: 847</span>
            <span>LATENCY: 0.3s</span>
            <span>AGENTS: 5/6 ACTIVE</span>
          </div>
          <div className="v2-scenario-tabs">
            {scenarios.map((s, i) => (
              <button
                key={s.label}
                className={`v2-scenario-tab ${activeTab === i ? "active" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <m.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <ScenarioPlayer frames={scenarios[activeTab].frames} scenarioKey={`${activeTab}`} />
            </m.div>
          </AnimatePresence>
        </DashboardPanel>

        <TelemetryPanel />
      </div>
    </AnimatedSection>
  );
}
