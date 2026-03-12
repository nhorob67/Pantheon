"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";
import { REVEAL_SLOW } from "./motion-config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

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
          <div className="showcase-table">
            <div className="showcase-table-grid showcase-table-grid-3">
              <div className="showcase-col-header">Task</div>
              <div className="showcase-col-header">Priority</div>
              <div className="showcase-col-header">Status</div>

              <div className="showcase-cell-primary">Q1 budget review</div>
              <div className="showcase-cell-secondary">HIGH</div>
              <div><span className="response-tag good">READY</span></div>

              <div className="showcase-cell-primary">Client proposal — Meridian Group</div>
              <div className="showcase-cell-secondary">MED</div>
              <div className="showcase-cell-secondary">2:00 PM</div>

              <div className="showcase-cell-primary">Vendor contract renewal</div>
              <div className="showcase-cell-secondary">MED</div>
              <div><span className="response-tag caution">DUE FRI</span></div>

              <div className="showcase-cell-primary">Review contractor invoices</div>
              <div className="showcase-cell-secondary">LOW</div>
              <div className="showcase-cell-secondary">NEW</div>
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
          <div className="showcase-list">
            <div className="showcase-list-item">
              <span className="showcase-list-num">1.</span>
              <span className="showcase-list-text">IT setup: laptop, email, software access</span>
              <span className="response-tag bad">REQUIRED</span>
            </div>
            <div className="showcase-list-item">
              <span className="showcase-list-num">2.</span>
              <span className="showcase-list-text">HR paperwork and benefits enrollment</span>
              <span className="response-tag bad">REQUIRED</span>
            </div>
            <div className="showcase-list-item">
              <span className="showcase-list-num">3.</span>
              <span className="showcase-list-text">Team introductions and org chart walkthrough</span>
              <span className="response-tag good">SCHEDULED</span>
            </div>
            <div className="showcase-list-item">
              <span className="showcase-list-num">4.</span>
              <span className="showcase-list-text">Project orientation and tool training</span>
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
          <div className="showcase-list">
            <div className="showcase-list-item">
              <span className="showcase-list-vendor">Vendor A</span>
              <span className="showcase-list-text">$4,200/mo &middot; 99.9% SLA &middot; 24/7 support</span>
              <span className="response-tag good">BEST VALUE</span>
            </div>
            <div className="showcase-list-item">
              <span className="showcase-list-vendor">Vendor B</span>
              <span className="showcase-list-text">$3,800/mo &middot; 99.5% SLA &middot; Business hours</span>
              <span className="response-tag caution">CHEAPEST</span>
            </div>
            <div className="showcase-list-item">
              <span className="showcase-list-vendor">Vendor C</span>
              <span className="showcase-list-text">$5,100/mo &middot; 99.99% SLA &middot; Dedicated rep</span>
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
          <div className="showcase-table">
            <div className="showcase-table-grid showcase-table-grid-3alt">
              <div className="showcase-col-header">Person</div>
              <div className="showcase-col-header">Topic</div>
              <div className="showcase-col-header">Status</div>

              <div className="showcase-cell-primary">Lisa (accountant)</div>
              <div className="showcase-cell-secondary">Q1 tax documents</div>
              <div><span className="response-tag bad">DUE WED</span></div>

              <div className="showcase-cell-primary">Meridian Group</div>
              <div className="showcase-cell-secondary">Partnership proposal</div>
              <div><span className="response-tag caution">WAITING</span></div>

              <div className="showcase-cell-primary">Dave (contractor)</div>
              <div className="showcase-cell-secondary">Project timeline update</div>
              <div><span className="response-tag caution">WAITING</span></div>

              <div className="showcase-cell-primary">AWS support</div>
              <div className="showcase-cell-secondary">Billing inquiry</div>
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
          <div className="showcase-table">
            <div className="showcase-table-grid showcase-table-grid-3alt">
              <div className="showcase-col-header">Decision</div>
              <div className="showcase-col-header">Owner</div>
              <div className="showcase-col-header">Due</div>

              <div className="showcase-cell-primary">Switch to Vendor A for hosting</div>
              <div className="showcase-cell-secondary">You</div>
              <div><span className="response-tag caution">MAR 7</span></div>

              <div className="showcase-cell-primary">Hire second contractor for Q2</div>
              <div className="showcase-cell-secondary">Dave</div>
              <div><span className="response-tag good">IN PROGRESS</span></div>

              <div className="showcase-cell-primary">Update client SLA templates</div>
              <div className="showcase-cell-secondary">Sarah</div>
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
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const words = text.split(" ");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (reduced) {
      setCount(words.length);
      onDoneRef.current?.();
      return;
    }
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
  }, [words.length, reduced]);

  return (
    <>
      {words.slice(0, count).join(" ")}
      {count < words.length && <span className="stream-cursor" />}
    </>
  );
}

function UserTyping({ text, onDone }: { text: string; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [chars, setChars] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (reduced) {
      setChars(text.length);
      onDoneRef.current();
      return;
    }
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
  }, [text, reduced]);

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
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={REVEAL_SLOW}
      >
        <div className="showcase-header">
          <div className="section-label">See It In Action</div>
          <h2 className="section-title-display">Tasks, people, and decisions: handled.</h2>
          <p className="section-sub">No more juggling apps, threads, and sticky notes. Ask your pantheon anything, from what you need to do today to what your vendor quoted last Tuesday.</p>
        </div>

        <div className="scenario-tabs" role="tablist" aria-label="Conversation scenarios">
          {scenarios.map((s, i) => (
            <button
              key={s.label}
              role="tab"
              aria-selected={activeTab === i}
              aria-controls={`scenario-panel-${i}`}
              tabIndex={activeTab === i ? 0 : -1}
              className={`scenario-tab ${activeTab === i ? "active" : ""}`}
              onClick={() => setActiveTab(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") { e.preventDefault(); setActiveTab(Math.min(i + 1, scenarios.length - 1)); }
                if (e.key === "ArrowLeft") { e.preventDefault(); setActiveTab(Math.max(i - 1, 0)); }
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={activeTab}
            id={`scenario-panel-${activeTab}`}
            role="tabpanel"
            aria-label={scenarios[activeTab].label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <div className="showcase-terminal">
              <div className="terminal-header">
                <span className="terminal-status-bar">OPERATIONAL &mdash; 4 agents active</span>
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
