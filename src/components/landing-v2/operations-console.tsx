"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { m, AnimatePresence } from "motion/react";
import { AnimatedSection, SectionHeader } from "./animated-section";
import { AGENTS } from "./data/agents";

interface ConversationFrame {
  type: "user" | "agent";
  agent?: string;
  text: string;
  richContent?: React.ReactNode;
  delay: number;
}

const scenarios: { label: string; channel: string; frames: ConversationFrame[] }[] = [
  {
    label: "Daily Briefing",
    channel: "operations",
    frames: [
      { type: "user", text: "What's on my plate today?", delay: 0 },
      {
        type: "agent",
        agent: "Athena",
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
      { type: "agent", agent: "Athena", text: "I'd focus on the vendor contract first — it expires Friday and needs sign-off. Budget review is prepped and ready for 10 AM.", delay: 400 },
    ],
  },
  {
    label: "Standing Orders",
    channel: "operations",
    frames: [
      { type: "user", text: "Walk me through new employee onboarding", delay: 0 },
      {
        type: "agent",
        agent: "Ares",
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
      { type: "agent", agent: "Ares", text: "Sarah's start date is Monday. IT setup is in progress and HR paperwork was sent yesterday.", delay: 400 },
    ],
  },
  {
    label: "Field Intelligence",
    channel: "intel",
    frames: [
      { type: "user", text: "Compare the proposals from our three vendors", delay: 0 },
      {
        type: "agent",
        agent: "Apollo",
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
      { type: "agent", agent: "Apollo", text: "Vendor A gives the best balance of cost and reliability. Vendor B saves $400/mo but cuts support hours in half.", delay: 400 },
    ],
  },
  {
    label: "Signal Intercept",
    channel: "comms",
    frames: [
      { type: "user", text: "Who do I still need to get back to?", delay: 0 },
      {
        type: "agent",
        agent: "Hermes",
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
      { type: "agent", agent: "Hermes", text: "The tax documents for Lisa are the most time-sensitive — she needs them by Wednesday. The Meridian proposal has been waiting since last week.", delay: 400 },
    ],
  },
  {
    label: "Deadline Watch",
    channel: "deadlines",
    frames: [
      { type: "user", text: "What did we decide in last week's team meeting?", delay: 0 },
      {
        type: "agent",
        agent: "Artemis",
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
      { type: "agent", agent: "Artemis", text: "Three directives. The vendor switch is on you — deadline is Friday. Dave started the contractor search. Sarah's SLA update is overdue.", delay: 400 },
    ],
  },
];

const channels = [
  { name: "general", hasActivity: false },
  { name: "operations", hasActivity: true },
  { name: "intel", hasActivity: false },
  { name: "comms", hasActivity: true },
  { name: "deadlines", hasActivity: false },
  { name: "sops", hasActivity: false },
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

function getAgentData(name: string) {
  return AGENTS.find((a) => a.name === name);
}

function DiscordScenarioPlayer({ frames, scenarioKey }: { frames: ConversationFrame[]; scenarioKey: string }) {
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
    <div className="v2-discord-messages">
      {visibleFrames.map((idx) => {
        const frame = frames[idx];
        if (frame.type === "user") {
          return (
            <div key={`${scenarioKey}-${idx}`} className="v2-discord-msg">
              <div className="v2-discord-avatar v2-discord-avatar-user">Y</div>
              <div className="v2-discord-msg-body">
                <div className="v2-discord-msg-header">
                  <span className="v2-discord-msg-name v2-discord-msg-name-user">You</span>
                  <span className="v2-discord-msg-time">Today at 9:04 AM</span>
                </div>
                <div className="v2-discord-msg-text">
                  <ProgressiveText text={frame.text} mode="char" speed={45} onDone={() => handleFrameDone(idx)} />
                </div>
              </div>
            </div>
          );
        }
        const agent = frame.agent ? getAgentData(frame.agent) : null;
        const Mark = agent?.mark;
        return (
          <div key={`${scenarioKey}-${idx}`} className="v2-discord-msg">
            <div className="v2-discord-avatar v2-discord-avatar-agent">
              {Mark ? <Mark size={18} /> : "P"}
            </div>
            <div className="v2-discord-msg-body">
              <div className="v2-discord-msg-header">
                <span className="v2-discord-msg-name v2-discord-msg-name-agent">{frame.agent ?? "Pantheon"}</span>
                <span className="v2-discord-msg-badge">BOT</span>
                <span className="v2-discord-msg-time">Today at 9:04 AM</span>
              </div>
              <div className="v2-discord-msg-text">
                {currentStreaming === idx ? (
                  <strong><ProgressiveText text={frame.text} mode="word" speed={40} onDone={() => handleFrameDone(idx)} /></strong>
                ) : (
                  <strong>{frame.text}</strong>
                )}
                {showRich.has(idx) && frame.richContent}
              </div>
            </div>
          </div>
        );
      })}
      {visibleFrames.length > 0 && currentStreaming === -1 && visibleFrames.length < frames.length && (
        <div className="v2-discord-typing">
          <div className="v2-typing-indicator"><span /><span /><span /></div>
          <span className="v2-discord-typing-text">{frames[visibleFrames.length]?.agent ?? "Agent"} is typing...</span>
        </div>
      )}
    </div>
  );
}

export function OperationsConsole() {
  const [activeTab, setActiveTab] = useState(0);
  const activeChannel = scenarios[activeTab].channel;

  return (
    <AnimatedSection id="skills">
      <SectionHeader
        label="Field Operations"
        title="Your council reports inside Discord."
        subtitle="No new app to learn. Your agents respond in channels your team already knows how to use."
      />

      <div className="v2-discord-mockup">
        {/* Channel sidebar */}
        <div className="v2-discord-sidebar">
          <div className="v2-discord-server-header">
            <DiscordMark />
            <span>Your Team Server</span>
          </div>
          <div className="v2-discord-channel-list">
            <div className="v2-discord-channel-category">Pantheon Agents</div>
            {channels.map((ch) => (
              <button
                key={ch.name}
                className={`v2-discord-channel ${activeChannel === ch.name ? "active" : ""}`}
                onClick={() => {
                  const idx = scenarios.findIndex((s) => s.channel === ch.name);
                  if (idx !== -1) setActiveTab(idx);
                }}
              >
                <span className="v2-discord-channel-hash">#</span>
                <span className="v2-discord-channel-name">{ch.name}</span>
                {ch.hasActivity && activeChannel !== ch.name && (
                  <span className="v2-discord-channel-badge" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main message area */}
        <div className="v2-discord-main">
          <div className="v2-discord-toolbar">
            <span className="v2-discord-channel-hash">#</span>
            <span className="v2-discord-toolbar-name">{activeChannel}</span>
          </div>

          {/* Scenario tabs */}
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
              <DiscordScenarioPlayer frames={scenarios[activeTab].frames} scenarioKey={`${activeTab}`} />
            </m.div>
          </AnimatePresence>

          {/* Input bar */}
          <div className="v2-discord-input-bar">
            <span className="v2-discord-input-placeholder">Message #{activeChannel}</span>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

function DiscordMark() {
  return (
    <svg width="18" height="14" viewBox="0 0 71 55" fill="currentColor" aria-hidden="true">
      <path d="M60.1 4.9A58.5 58.5 0 0 0 45.4.2a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37 37 0 0 0 25.4.3a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.5 5a.2.2 0 0 0-.1 0A59.7 59.7 0 0 0 .2 45.3a.2.2 0 0 0 .1.2A58.8 58.8 0 0 0 18 54.8a.2.2 0 0 0 .3-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.8 38.8 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.9a.2.2 0 0 1 .2 0 42 42 0 0 0 35.8 0 .2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .3 36.4 36.4 0 0 1-5.5 2.7.2.2 0 0 0-.1.3 47.2 47.2 0 0 0 3.6 5.9.2.2 0 0 0 .3.1A58.6 58.6 0 0 0 70.3 45.4a.2.2 0 0 0 0-.2A59.2 59.2 0 0 0 60.2 5a.2.2 0 0 0-.1 0ZM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.1 6.4-7.1 6.5 3.2 6.4 7.1c0 4-2.8 7.2-6.4 7.2Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.1 6.4-7.1 6.5 3.2 6.4 7.1c0 4-2.8 7.2-6.4 7.2Z" />
    </svg>
  );
}
