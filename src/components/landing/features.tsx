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
    label: "Grain Marketing",
    frames: [
      { type: "user", text: "What's corn at today?", delay: 0 },
      {
        type: "assistant",
        text: "Cash Corn Bids — Mar 3, 9:15 AM",
        delay: 600,
        richContent: (
          <table className="response-table">
            <thead>
              <tr><th>Elevator</th><th>Bid</th><th>Basis</th><th></th></tr>
            </thead>
            <tbody>
              <tr><td>CHS Fargo</td><td><span className="bid-price">$4.52</span></td><td>-35 Mar</td><td></td></tr>
              <tr><td>ADM Casselton</td><td><span className="bid-price">$4.48</span></td><td>-39 Mar</td><td></td></tr>
              <tr><td>Cargill W. Fargo</td><td><span className="bid-price">$4.55</span></td><td>-32 Mar</td><td><span className="response-tag good">BEST</span></td></tr>
            </tbody>
          </table>
        ),
      },
      { type: "assistant", text: "Cargill has the best bid today, 7c over ADM. Basis has narrowed 3c this week across the board.", delay: 400 },
    ],
  },
  {
    label: "Weather & Spray",
    frames: [
      { type: "user", text: "Spray window tomorrow?", delay: 0 },
      {
        type: "assistant",
        text: "Spray Windows — Tomorrow, Cass County",
        delay: 600,
        richContent: (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)", minWidth: 80 }}>6 AM – 11 AM</span>
              <span className="response-tag good">GOOD</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Wind 5-8 mph SW, 62-71F, 0% precip</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)", minWidth: 80 }}>1 PM – 5 PM</span>
              <span className="response-tag bad">AVOID</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Gusting 18-22 mph</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)", minWidth: 80 }}>6 PM – 8 PM</span>
              <span className="response-tag caution">MARGINAL</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Wind drops to 4 mph — inversion risk</span>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "I'd recommend hitting it early. After 11 the wind picks up and you won't get another clean window until evening, and that's borderline with inversion risk.", delay: 400 },
    ],
  },
  {
    label: "Scale Tickets",
    frames: [
      { type: "user", text: "Just dropped off a load at CHS", delay: 0 },
      {
        type: "assistant",
        text: "Got it. Here's what I pulled from the ticket:",
        delay: 600,
        richContent: (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13 }}>
              <div><span style={{ color: "var(--text-dim)" }}>Crop</span><br /><strong style={{ color: "var(--text-primary)" }}>Corn</strong></div>
              <div><span style={{ color: "var(--text-dim)" }}>Elevator</span><br /><strong style={{ color: "var(--text-primary)" }}>CHS Fargo</strong></div>
              <div><span style={{ color: "var(--text-dim)" }}>Net Weight</span><br /><strong style={{ color: "var(--text-primary)" }}>610.0 bu</strong></div>
              <div><span style={{ color: "var(--text-dim)" }}>Moisture</span><br /><strong style={{ color: "var(--text-primary)" }}>14.2%</strong></div>
              <div><span style={{ color: "var(--text-dim)" }}>Test Weight</span><br /><strong style={{ color: "var(--text-primary)" }}>57.8 lb/bu</strong></div>
              <div><span style={{ color: "var(--text-dim)" }}>Dockage</span><br /><strong style={{ color: "var(--text-primary)" }}>0.3%</strong></div>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "Want me to log this? That puts you at 12,400 bu delivered this season.", delay: 400 },
    ],
  },
  {
    label: "Custom",
    frames: [
      { type: "user", text: "Compare ARC-CO vs PLC for corn in Cass County at $4.50", delay: 0 },
      {
        type: "assistant",
        text: "Let me pull the county benchmarks and run the comparison...",
        delay: 600,
        richContent: (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13 }}>
              <div style={{ color: "var(--text-dim)" }}></div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>ARC-CO</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>PLC</div>

              <div style={{ color: "var(--text-dim)" }}>Est. Payment</div>
              <div><span className="bid-price">$38/acre</span></div>
              <div style={{ color: "var(--text-secondary)" }}>$0/acre</div>

              <div style={{ color: "var(--text-dim)" }}>Trigger Price</div>
              <div style={{ color: "var(--text-secondary)" }}>$4.88 benchmark</div>
              <div style={{ color: "var(--text-secondary)" }}>$3.70 ref</div>

              <div style={{ color: "var(--text-dim)" }}>Best When</div>
              <div style={{ color: "var(--text-secondary)" }}>Moderate dip</div>
              <div style={{ color: "var(--text-secondary)" }}>Major collapse</div>
            </div>
          </div>
        ),
      },
      { type: "assistant", text: "At $4.50, ARC-CO pays out. PLC doesn't trigger until below $3.70. ARC-CO is the better bet unless you expect a major price collapse.", delay: 400 },
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
          <h2 className="section-title-display">One team. Every question your operation throws at it.</h2>
          <p className="section-sub">No dashboards. No apps to switch between. Just ask what you need — your team handles the rest.</p>
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
                <span className="terminal-title">farmclaw — {scenarios[activeTab].label.toLowerCase()}</span>
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
