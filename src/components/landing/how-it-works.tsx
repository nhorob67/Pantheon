"use client";

import { useState } from "react";

const steps = [
  { num: "01", title: "Tell us about your farm", desc: "State, county, crops, acres, and which elevators you sell to. Takes about 3 minutes. This is how we build an assistant that actually knows your operation." },
  { num: "02", title: "Connect your Discord server", desc: "Create a free Discord server for your farm (or use one you already have). Add our bot with one click. Your assistant shows up ready to post in #grain-bids, #weather, and whatever other channels you set up." },
  { num: "03", title: "We set up your assistant", desc: "We build a dedicated AI assistant configured for your farm — your elevators, your location, your crops. It's not shared. It's yours, running 24/7." },
  { num: "04", title: "Start texting — grain bids at 9 AM tomorrow", desc: "Your assistant sends a weather briefing at 6 AM and cash bids at 9 AM. From there, ask it anything — it learns your preferences and gets better every day." },
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
          <span style={{ background: "var(--green-dim)", color: "var(--green-bright)", padding: "4px 12px", borderRadius: 100, fontSize: 13 }}>🌽 Corn</span>
          <span style={{ background: "var(--green-dim)", color: "var(--green-bright)", padding: "4px 12px", borderRadius: 100, fontSize: 13 }}>🫘 Soybeans</span>
          <span style={{ background: "var(--green-dim)", color: "var(--green-bright)", padding: "4px 12px", borderRadius: 100, fontSize: 13 }}>🌾 Spring Wheat</span>
        </div>
      </div>
      <div style={{ background: "var(--bg-dark)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>ELEVATORS</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>CHS Fargo · ADM Casselton · Cargill West Fargo</div>
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
    <div style={{ padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(88, 101, 242, 0.1)", border: "2px solid rgba(88, 101, 242, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#5865F2" }}>#</div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center" as const, marginBottom: 20 }}>Discord</div>
      <div style={{ background: "var(--bg-dark)", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8 }}>YOUR SERVER</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
          {["# grain-bids", "# weather", "# equipment", "# general"].map((ch) => (
            <div key={ch} style={{ fontSize: 14, color: "var(--text-secondary)", padding: "6px 8px", borderRadius: 6, background: "rgba(255,255,255,0.03)" }}>{ch}</div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 16, background: "var(--bg-dark)", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8 }}>PASTE YOUR BOT TOKEN</div>
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-secondary)", background: "rgba(0,0,0,0.2)", padding: "10px 12px", borderRadius: 6 }}>MTIzNDU2Nzg5...</div>
      </div>
    </div>
  );
}

function StepVisual3() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 0" }}>
      <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 4 }}>Setting Up Your Assistant</div>
      {["Server provisioned", "Farm profile loaded", "Skills installed: Grain Bids, Weather, Ag Intel", "Discord server connected"].map((text) => (
        <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green-dim)", color: "var(--green-bright)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✓</div>
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{text}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, animation: "pulse 1.5s infinite", flexShrink: 0 }}>●</div>
        <span style={{ fontSize: 14, color: "var(--accent)" }}>Running health checks...</span>
      </div>
      <div style={{ marginTop: 12, padding: 14, background: "var(--bg-dark)", borderRadius: 10, border: "1px solid var(--green-dim)" }}>
        <span style={{ fontSize: 13, color: "var(--green-bright)" }}>Your assistant will be live in ~45 seconds</span>
      </div>
    </div>
  );
}

function StepVisual4() {
  return (
    <div className="phone-mockup">
      <div className="phone-header">
        <div className="phone-avatar">🌾</div>
        <div>
          <div className="phone-name">FarmClaw</div>
          <div className="phone-status">online</div>
        </div>
      </div>
      <div className="phone-messages">
        <div className="phone-msg in">☀️ <strong>Morning Weather — Fargo, ND</strong><br />Today: Sunny, High 34°F, Wind NW 8mph. No precip. Clear week ahead.</div>
        <div className="phone-msg in">📊 <strong>Cash Bids — Feb 12</strong><br />🌽 Best corn: Cargill $4.55 (-32)<br />🫘 Best beans: ADM $10.22 (-48)</div>
        <div className="phone-msg out">What&apos;s wheat looking like?</div>
        <div className="phone-msg in">Spring wheat bids:<br />CHS Fargo: <strong>$6.18</strong> (basis -22 Mar)<br />Cargill: <strong>$6.14</strong> (basis -26 Mar)</div>
      </div>
    </div>
  );
}

const visuals = [StepVisual1, StepVisual2, StepVisual3, StepVisual4];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const ActiveVisual = visuals[activeStep];

  return (
    <section className="how-section" id="how">
      <div className="section-label">How It Works</div>
      <h2 className="section-title">From signup to your first grain bid in under 10 minutes.</h2>

      <div className="how-grid">
        <div className="how-steps">
          {steps.map((step, i) => (
            <div key={step.num} className={`how-step ${activeStep === i ? "active" : ""}`} onClick={() => setActiveStep(i)}>
              <div className="how-step-header">
                <div className="how-step-num">{step.num}</div>
                <div className="how-step-title">{step.title}</div>
              </div>
              <div className="how-step-desc">{step.desc}</div>
            </div>
          ))}
        </div>

        <div className="how-visual">
          <div key={activeStep} style={{ animation: "fadeIn 0.4s ease" }}>
            <ActiveVisual />
          </div>
        </div>
      </div>
    </section>
  );
}
