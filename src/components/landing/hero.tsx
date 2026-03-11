"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { m, LazyMotion, domAnimation } from "motion/react";
import { ArrowRight } from "lucide-react";

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

    // Start the animation after mount
    timers.push(setTimeout(() => setPhase(0), 600));

    return () => timers.forEach(clearTimeout);
  }, []);

  // Character-by-character user typing
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

  // Typing indicator then response
  useEffect(() => {
    if (phase !== 1) return;
    timerRef.current.push(setTimeout(() => setPhase(2), 1000));
  }, [phase]);

  // Stream response word by word
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
        <div className="terminal-dots">
          <span /><span /><span />
        </div>
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
                      <td>Client proposal — Meridian Group</td>
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

export function Hero() {
  return (
    <LazyMotion features={domAnimation}>
      <section className="hero">
        <div className="hero-left">
          <m.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <div className="hero-badge">
              <span className="dot" style={{ background: "var(--green-bright)" }} />
              Your AI team, ready to work
            </div>
          </m.div>

          <m.h1
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.05 }}
          >
            You run on a thousand decisions a day.<br /><em>Your tools should keep up.</em>
          </m.h1>

          <m.p
            className="hero-sub"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Vendor emails. Employee questions. Client deadlines. It all lands on you. Pantheon gives you a team of AI agents in Discord that track it all: tasks, email, SOPs, research, and communication with everyone who needs a piece of your time.
          </m.p>

          <m.div
            className="hero-actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link href="/signup" className="btn-primary">Start Free Trial</Link>
            <Link href="#how" className="btn-ghost">
              See how it works <ArrowRight size={16} />
            </Link>
          </m.div>

          <m.p
            className="text-text-dim text-sm mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            14 days free. No credit card required.
          </m.p>
        </div>

        <m.div
          className="hero-right"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <HeroTerminal />
        </m.div>
      </section>
    </LazyMotion>
  );
}
