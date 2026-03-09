"use client";

import { useState } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";

const steps = [
  { num: "01", title: "Tell us about your operation", desc: "Crops, county, acres, and what you need help with — task tracking, SOPs, grain marketing, whatever your operation demands. Takes about 3 minutes." },
  { num: "02", title: "Add FarmClaw to Discord", desc: "Click the invite link and FarmClaw joins your Discord server. No bot tokens, no developer portal, no configuration. Just add and go." },
  { num: "03", title: "Your team goes to work", desc: "Morning briefings, daily task lists, procedure checklists, and answers to whatever you ask — your team is live instantly. It learns your operation and gets sharper over time." },
];

function StepVisual1() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}>Your Farm Profile</div>
      <div style={{ background: "var(--bg-dark)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>LOCATION</div>
        <div style={{ fontSize: 15 }}>Cass County, North Dakota</div>
      </div>
      <div style={{ background: "var(--bg-dark)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>CROPS</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          <span style={{ background: "var(--green-dim)", color: "var(--green-bright)", padding: "4px 12px", borderRadius: 100, fontSize: 13 }}>Corn</span>
          <span style={{ background: "var(--green-dim)", color: "var(--green-bright)", padding: "4px 12px", borderRadius: 100, fontSize: 13 }}>Soybeans</span>
          <span style={{ background: "var(--green-dim)", color: "var(--green-bright)", padding: "4px 12px", borderRadius: 100, fontSize: 13 }}>Spring Wheat</span>
        </div>
      </div>
      <div style={{ background: "var(--bg-dark)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>ELEVATORS</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>CHS Fargo &middot; ADM Casselton &middot; Cargill West Fargo</div>
      </div>
      <div style={{ background: "var(--bg-dark)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>TOTAL ACRES</div>
        <div style={{ fontSize: 15 }}>2,400</div>
      </div>
    </div>
  );
}

function StepVisual2() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(88, 101, 242, 0.1)", border: "2px solid rgba(88, 101, 242, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#5865F2" }}>
          <svg width="28" height="22" viewBox="0 0 28 22" fill="currentColor"><path d="M23.7 1.8A23 23 0 0 0 18 0a.1.1 0 0 0-.1 0 16 16 0 0 0-.7 1.5 21.4 21.4 0 0 0-6.4 0A14.7 14.7 0 0 0 10 0h-.1A23 23 0 0 0 4.3 1.8 24 24 0 0 0 .1 16.9a23.3 23.3 0 0 0 7.1 3.6.1.1 0 0 0 .1 0 16 16 0 0 0 1.4-2.3.1.1 0 0 0 0-.1 15.3 15.3 0 0 1-2.4-1.2.1.1 0 0 1 0-.2l.5-.4h.1a16.6 16.6 0 0 0 14.2 0h.1l.5.4a.1.1 0 0 1 0 .2 14.4 14.4 0 0 1-2.4 1.2.1.1 0 0 0 0 .1c.4.8.9 1.6 1.4 2.3h.1a23.2 23.2 0 0 0 7.1-3.6A23.8 23.8 0 0 0 23.7 1.8zM9.3 13.9c-1.4 0-2.5-1.3-2.5-2.8S8 8.2 9.4 8.2s2.5 1.3 2.5 2.8-1.1 2.9-2.5 2.9zm9.3 0c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.9 2.5-2.9 2.5 1.3 2.5 2.8-1.1 2.9-2.5 2.9z" /></svg>
        </div>
      </div>

      <div style={{ background: "var(--bg-dark)", borderRadius: 12, padding: 20, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Add to Server</div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 }}>SELECT A SERVER</div>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: "var(--text-primary)" }}>Johnson Farms</span>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>&#x25BC;</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 }}>PERMISSIONS</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 16 }}>
          {["Send Messages", "Read Message History", "Embed Links"].map((p) => (
            <div key={p} style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--green-bright)", fontSize: 14 }}>&#x2713;</span> {p}
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(88, 101, 242, 0.9)", color: "#fff", textAlign: "center" as const, padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
          Authorize
        </div>
      </div>

      <div style={{ padding: 14, background: "var(--bg-dark)", borderRadius: 10, border: "1px solid var(--green-dim)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--green-bright)", fontSize: 18 }}>&#x2713;</span>
        <span style={{ fontSize: 13, color: "var(--green-bright)" }}>FarmClaw has been added to Johnson Farms</span>
      </div>
    </div>
  );
}

function StepVisual3() {
  return (
    <div className="phone-mockup">
      <div className="phone-header">
        <div className="phone-avatar">&#x1F33E;</div>
        <div>
          <div className="phone-name">FarmClaw</div>
          <div className="phone-status">online</div>
        </div>
      </div>
      <div className="phone-messages">
        <div className="phone-msg in"><strong>Morning Briefing — Fargo, ND</strong><br />3 tasks today. Spray window 6–11 AM. High 34F, clear skies.</div>
        <div className="phone-msg in"><strong>Reminder: FSA acreage report due Friday</strong><br />Want me to pull last year&apos;s numbers?</div>
        <div className="phone-msg out">Yeah pull those up. And add &apos;check tile outlets&apos; to my list</div>
        <div className="phone-msg in">Done. Last year&apos;s report is ready, and I added tile outlet check to today&apos;s tasks.</div>
      </div>
    </div>
  );
}

const visuals = [StepVisual1, StepVisual2, StepVisual3];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="how-section"
        id="how"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <div className="section-label">How It Works</div>
        <h2 className="section-title-display">Three minutes to set up. Your AI team starts tomorrow.</h2>

        <div className="how-grid">
          <div className="how-steps">
            {steps.map((step, i) => (
              <div key={step.num} className={`how-step ${activeStep === i ? "active" : ""}`} onClick={() => setActiveStep(i)}>
                <div className="how-step-header">
                  <div className="how-step-num">{step.num}</div>
                  <div className="how-step-title">{step.title}</div>
                </div>
                <AnimatePresence>
                  {activeStep === i && (
                    <m.div
                      className="how-step-desc"
                      initial={{ maxHeight: 0, opacity: 0 }}
                      animate={{ maxHeight: 200, opacity: 1, marginTop: 12 }}
                      exit={{ maxHeight: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.4 }}
                      style={{ overflow: "hidden", paddingLeft: 68 }}
                    >
                      {step.desc}
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="how-visual">
            <AnimatePresence mode="wait">
              <m.div
                key={activeStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                {(() => { const V = visuals[activeStep]; return <V />; })()}
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </m.section>
    </LazyMotion>
  );
}
