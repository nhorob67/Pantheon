"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";
import { REVEAL_SLOW, FADE_UP } from "./motion-config";
import { Athena, Hermes, Ares, Apollo, StatusIndicator } from "./deity-marks";

const AGENTS = [
  { name: "Athena", mark: Athena, status: true, actions: ["Triaged 3 vendor emails", "Updated Q1 budget summary", "Flagged overdue contract"] },
  { name: "Hermes", mark: Hermes, status: true, actions: ["Drafted client proposal", "Sent follow-up to Lisa", "Scheduled team standup"] },
  { name: "Ares", mark: Ares, status: false, actions: ["Completed SOP audit", "Updated onboarding checklist", "Reviewed compliance docs"] },
  { name: "Apollo", mark: Apollo, status: true, actions: ["Analyzed vendor pricing", "Compiled market report", "Summarized Q4 results"] },
];

const CONVERSATION: { type: "user" | "typing" | "response"; text?: string; rich?: boolean; delay: number }[] = [
  { type: "user", text: "What do I need to get done today?", delay: 0 },
  { type: "typing", delay: 800 },
  { type: "response", rich: true, delay: 1400 },
];

function HeroTerminal() {
  const [phase, setPhase] = useState(-1);
  const [userText, setUserText] = useState("");
  const [responseWords, setResponseWords] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timerRef.current;
    timers.push(setTimeout(() => setPhase(0), 600));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== 0) return;
    const fullText = CONVERSATION[0].text!;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setUserText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        timerRef.current.push(setTimeout(() => setPhase(1), 400));
      }
    }, 45);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 1) return;
    timerRef.current.push(setTimeout(() => setPhase(2), 1000));
  }, [phase]);

  const responseLine = "Today's Priorities, Monday, Mar 3";
  const responseWordsArr = responseLine.split(" ");
  const summaryText = "The vendor contract is the most time-sensitive. I'd handle that before the budget review. Client proposal can go out after lunch. Want me to draft it?";
  const summaryWords = summaryText.split(" ");

  useEffect(() => {
    if (phase !== 2) return;
    let w = 0;
    const interval = setInterval(() => {
      w++;
      setResponseWords(w);
      if (w >= responseWordsArr.length) {
        clearInterval(interval);
        timerRef.current.push(setTimeout(() => setShowTable(true), 200));
      }
    }, 60);
    return () => clearInterval(interval);
  }, [phase, responseWordsArr.length]);

  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <span className="terminal-status-bar">OPERATIONAL &mdash; 4 agents active</span>
        <span className="terminal-title">pantheon</span>
      </div>
      <div className="terminal-body">
        {phase >= 0 && (
          <div className="terminal-user">
            <span className="prompt">&gt;</span>
            <span className="text">
              {userText}
              {phase === 0 && <span className="stream-cursor" />}
            </span>
          </div>
        )}

        {phase === 1 && (
          <div className="typing-indicator">
            <span /><span /><span />
          </div>
        )}

        {phase >= 2 && (
          <div className="terminal-response">
            <strong>{responseWordsArr.slice(0, responseWords).join(" ")}</strong>
            {!showTable && phase === 2 && <span className="stream-cursor" />}

            {showTable && (
              <>
                <table className="response-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Q1 budget review</td>
                      <td><span className="status-tag ready">Ready</span></td>
                      <td>Today 10 AM</td>
                    </tr>
                    <tr>
                      <td>Client proposal &mdash; Meridian Group</td>
                      <td><span className="status-tag confirmed">Draft ready</span></td>
                      <td>Today 2 PM</td>
                    </tr>
                    <tr>
                      <td>Vendor contract renewal</td>
                      <td><span className="status-tag due-soon">Due soon</span></td>
                      <td>Friday</td>
                    </tr>
                  </tbody>
                </table>
                <StreamText words={summaryWords} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StreamText({ words }: { words: string[] }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCount(i);
      if (i >= words.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <p style={{ marginTop: 8 }}>
      {words.slice(0, count).join(" ")}
      {count < words.length && <span className="stream-cursor" />}
    </p>
  );
}

function AgentRosterStrip() {
  const [actionIndices, setActionIndices] = useState(AGENTS.map(() => 0));

  useEffect(() => {
    const interval = setInterval(() => {
      setActionIndices((prev) =>
        prev.map((idx, i) => (idx + 1) % AGENTS[i].actions.length)
      );
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hero-roster-strip">
      {AGENTS.map((agent, i) => {
        const Mark = agent.mark;
        return (
          <div key={agent.name} className="hero-roster-agent">
            <Mark size={18} className="hero-roster-mark" />
            <span className="hero-roster-name">{agent.name}</span>
            <StatusIndicator active={agent.status} />
            <AnimatePresence mode="wait">
              <m.span
                key={actionIndices[i]}
                className="hero-roster-action"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                {agent.actions[actionIndices[i]]}
              </m.span>
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function Hero() {
  return (
    <LazyMotion features={domAnimation}>
      <section className="hero">
        <div className="hero-left">
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={REVEAL_SLOW}
          >
            You run on a thousand decisions a day.
            <br />
            <span style={{ color: "var(--gold-divine)" }}>Your tools should keep up.</span>
          </m.h1>

          <m.p
            className="hero-sub"
            {...FADE_UP}
            transition={{ ...REVEAL_SLOW, delay: 0.2 }}
          >
            Vendor emails. Employee questions. Client deadlines. It all lands on you. Pantheon gives you a team of AI specialists — each with its own domain, its own skills, its own channel — working together in Discord so your whole team stops routing everything through one person.
          </m.p>

          <m.div
            className="hero-actions"
            {...FADE_UP}
            transition={{ ...REVEAL_SLOW, delay: 0.4 }}
          >
            <Link href="/signup" className="cta-inscription">Start Free Trial</Link>
            <Link href="#how" className="cta-inscription cta-inscription-ghost">See How It Works</Link>
          </m.div>

          <m.p
            className="text-sm mt-3"
            style={{ color: "var(--text-warm-gray)", fontFamily: "var(--mono)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...REVEAL_SLOW, delay: 0.6 }}
          >
            14 days free. No credit card required.
          </m.p>
        </div>

        <m.div
          className="hero-right"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...REVEAL_SLOW, delay: 0.6 }}
        >
          <HeroTerminal />
        </m.div>

        <m.div
          className="hero-roster-wrapper"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...REVEAL_SLOW, delay: 0.8 }}
        >
          <AgentRosterStrip />
        </m.div>
      </section>
    </LazyMotion>
  );
}
