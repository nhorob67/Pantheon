"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { m, LazyMotion, domAnimation } from "motion/react";
import { ArrowRight } from "lucide-react";

const CONVERSATION: { type: "user" | "typing" | "response"; text?: string; rich?: boolean; delay: number }[] = [
  { type: "user", text: "What's corn at today?", delay: 0 },
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
  const responseLine = "Cash Corn Bids — Mar 3, 9:15 AM";
  const responseWordsArr = responseLine.split(" ");
  const summaryText = "Cargill has the best bid today, 7c over ADM. Basis narrowed 3c this week.";
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
        <span className="terminal-title">farmclaw</span>
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
                      <th>Elevator</th>
                      <th>Bid</th>
                      <th>Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>CHS Fargo</td>
                      <td><span className="bid-price">$4.52</span></td>
                      <td>-35 Mar</td>
                    </tr>
                    <tr>
                      <td>ADM Casselton</td>
                      <td><span className="bid-price">$4.48</span></td>
                      <td>-39 Mar</td>
                    </tr>
                    <tr>
                      <td>Cargill W. Fargo</td>
                      <td><span className="bid-price">$4.55</span></td>
                      <td>-32 Mar</td>
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
              AI that works your farm
            </div>
          </m.div>

          <m.h1
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.05 }}
          >
            An AI team that actually knows<br /><em>your operation.</em>
          </m.h1>

          <m.p
            className="hero-sub"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            FarmClaw gives your farm a team of AI assistants — configured around your crops, your county, your elevators, and whatever else your operation needs. Grain bids, weather, agronomy, compliance — just ask.
          </m.p>

          <m.div
            className="hero-actions"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link href="/signup" className="btn-primary">Get Started</Link>
            <Link href="#how" className="btn-ghost">
              See how it works <ArrowRight size={16} />
            </Link>
          </m.div>
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
