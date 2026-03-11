"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";

interface ConversationFrame {
  type: "user" | "assistant";
  text: string;
  richContent?: React.ReactNode;
  delay: number;
}

const scenarios: { label: string; frames: ConversationFrame[] }[] = [
  {
    label: "Daily Tasks",
    frames: [
      { type: "user", text: "What's on my plate today?", delay: 0 },
      {
        type: "assistant",
        text: "Today's Task Board, Mar 3",
        delay: 600,
        richContent: (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "8px 16px", fontSize: 13 }}>
              <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1 }}>Task</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1 }}>Priority</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1 }}>Status</div>

              <div style={{ color: "var(--text-primary)" }}>Q1 budget review</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>HIGH</div>
              <div><span className="response-tag good">READY</span></div>

              <div style={{ color: "var(--text-primary)" }}>Client proposal — Meridian Group</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>MED</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>2:00 PM</div>

              <div style={{ color: "var(--text-primary)" }}>Vendor contract renewal</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>MED</div>
              <div><span className="response-tag caution">DUE FRI</span></div>

              <div style={{ color: "var(--text-primary)" }}>Review contractor invoices</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>LOW</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>NEW</div>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "I'd focus on the vendor contract first — it expires Friday and needs sign-off. Budget review is prepped and ready for 10 AM. The Meridian proposal can go out after lunch. Want me to draft it?", delay: 400 },
    ],
  },
  {
    label: "SOPs & Procedures",
    frames: [
      { type: "user", text: "Walk me through new employee onboarding", delay: 0 },
      {
        type: "assistant",
        text: "New Employee Onboarding Checklist",
        delay: 600,
        richContent: (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-dim)", minWidth: 24 }}>1.</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>IT setup: laptop, email, software access</span>
              <span className="response-tag bad">REQUIRED</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-dim)", minWidth: 24 }}>2.</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>HR paperwork and benefits enrollment</span>
              <span className="response-tag bad">REQUIRED</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--text-dim)", minWidth: 24 }}>3.</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>Team introductions and org chart walkthrough</span>
              <span className="response-tag good">SCHEDULED</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <span style={{ fontSize: 13, color: "var(--text-dim)", minWidth: 24 }}>4.</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>Project orientation and tool training</span>
              <span className="response-tag caution">WEEK 1</span>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "Sarah's start date is Monday. IT setup is in progress and HR paperwork was sent yesterday. Want me to schedule the team intro for Tuesday morning?", delay: 400 },
    ],
  },
  {
    label: "Research & Analysis",
    frames: [
      { type: "user", text: "Compare the proposals from our three vendors", delay: 0 },
      {
        type: "assistant",
        text: "Vendor Comparison: Cloud Infrastructure",
        delay: 600,
        richContent: (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)", minWidth: 100 }}>Vendor A</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>$4,200/mo &middot; 99.9% SLA &middot; 24/7 support</span>
              <span className="response-tag good">BEST VALUE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)", minWidth: 100 }}>Vendor B</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>$3,800/mo &middot; 99.5% SLA &middot; Business hours</span>
              <span className="response-tag caution">CHEAPEST</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)", minWidth: 100 }}>Vendor C</span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>$5,100/mo &middot; 99.99% SLA &middot; Dedicated rep</span>
              <span className="response-tag bad">PREMIUM</span>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "Vendor A gives the best balance of cost and reliability. Vendor B saves $400/mo but cuts support hours in half. Vendor C only makes sense if you need the four-nines SLA. Want me to draft a follow-up to Vendor A?", delay: 400 },
    ],
  },
  {
    label: "Email & Follow-ups",
    frames: [
      { type: "user", text: "Who do I still need to get back to?", delay: 0 },
      {
        type: "assistant",
        text: "Open Follow-Ups: This Week",
        delay: 600,
        richContent: (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px 16px", fontSize: 13 }}>
              <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1 }}>Person</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1 }}>Topic</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1 }}>Status</div>

              <div style={{ color: "var(--text-primary)" }}>Lisa (accountant)</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Q1 tax documents</div>
              <div><span className="response-tag bad">DUE WED</span></div>

              <div style={{ color: "var(--text-primary)" }}>Meridian Group</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Partnership proposal</div>
              <div><span className="response-tag caution">WAITING</span></div>

              <div style={{ color: "var(--text-primary)" }}>Dave (contractor)</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Project timeline update</div>
              <div><span className="response-tag caution">WAITING</span></div>

              <div style={{ color: "var(--text-primary)" }}>AWS support</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Billing inquiry</div>
              <div><span className="response-tag good">SENT</span></div>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "The tax documents for Lisa are the most time-sensitive — she needs them by Wednesday. The Meridian proposal has been waiting since last week. I'd handle those two first. Want me to draft a reply to Lisa?", delay: 400 },
    ],
  },
  {
    label: "People & Comms",
    frames: [
      { type: "user", text: "What did we decide in last week's team meeting?", delay: 0 },
      {
        type: "assistant",
        text: "Team Meeting Summary: Feb 28",
        delay: 600,
        richContent: (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px 16px", fontSize: 13 }}>
              <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1 }}>Decision</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1 }}>Owner</div>
              <div style={{ color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 1 }}>Due</div>

              <div style={{ color: "var(--text-primary)" }}>Switch to Vendor A for hosting</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>You</div>
              <div><span className="response-tag caution">MAR 7</span></div>

              <div style={{ color: "var(--text-primary)" }}>Hire second contractor for Q2</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Dave</div>
              <div><span className="response-tag good">IN PROGRESS</span></div>

              <div style={{ color: "var(--text-primary)" }}>Update client SLA templates</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Sarah</div>
              <div><span className="response-tag bad">OVERDUE</span></div>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "Three action items. The vendor switch is on you — deadline is Friday. Dave started the contractor search. Sarah's SLA update is overdue. Want me to send her a reminder?", delay: 400 },
    ],
  },
];

function StreamingText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [count, setCount] = useState(0);
  const words = text.split(" ");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCount(i);
      if (i >= words.length) {
        clearInterval(interval);
        onDoneRef.current?.();
      }
    }, 40);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <>
      {words.slice(0, count).join(" ")}
      {count < words.length && <span className="stream-cursor" />}
    </>
  );
}

function UserTyping({ text, onDone }: { text: string; onDone: () => void }) {
  const [chars, setChars] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setChars(i);
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(() => onDoneRef.current(), 300);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="terminal-user">
      <span className="prompt">&gt;</span>
      <span className="text">
        {text.slice(0, chars)}
        {chars < text.length && <span className="stream-cursor" />}
      </span>
    </div>
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
      if (frame.type === "user") {
        setCurrentStreaming(idx);
      } else {
        setCurrentStreaming(idx);
      }
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
    <div className="terminal-body">
      {visibleFrames.map((idx) => {
        const frame = frames[idx];
        if (frame.type === "user") {
          return (
            <UserTyping
              key={`${scenarioKey}-${idx}`}
              text={frame.text}
              onDone={() => handleFrameDone(idx)}
            />
          );
        }
        return (
          <div key={`${scenarioKey}-${idx}`} className="terminal-response">
            {currentStreaming === idx ? (
              <strong><StreamingText text={frame.text} onDone={() => handleFrameDone(idx)} /></strong>
            ) : (
              <strong>{frame.text}</strong>
            )}
            {showRich.has(idx) && frame.richContent}
          </div>
        );
      })}
      {visibleFrames.length > 0 && currentStreaming === -1 && visibleFrames.length < frames.length && (
        <div className="typing-indicator">
          <span /><span /><span />
        </div>
      )}
    </div>
  );
}

export function ConversationShowcase() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="showcase"
        id="skills"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <div className="showcase-header">
          <div className="section-label">See It In Action</div>
          <h2 className="section-title-display">Tasks, people, and decisions: handled.</h2>
          <p className="section-sub">No more juggling apps, threads, and sticky notes. Ask your team anything, from what you need to do today to what your vendor quoted last Tuesday.</p>
        </div>

        <div className="scenario-tabs">
          {scenarios.map((s, i) => (
            <button
              key={s.label}
              className={`scenario-tab ${activeTab === i ? "active" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="showcase-terminal">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span /><span /><span />
                </div>
                <span className="terminal-title">pantheon: {scenarios[activeTab].label.toLowerCase()}</span>
              </div>
              <ScenarioPlayer
                frames={scenarios[activeTab].frames}
                scenarioKey={`${activeTab}`}
              />
            </div>
          </m.div>
        </AnimatePresence>
      </m.section>
    </LazyMotion>
  );
}
