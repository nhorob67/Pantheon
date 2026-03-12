"use client";

import { useState } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";

const steps = [
  { num: "01", title: "Tell us about your work", desc: "Industry, focus areas, tools you use, and what you need help with. Task tracking, SOPs, email, research, whatever your business demands. Takes about 3 minutes." },
  { num: "02", title: "Add Pantheon to Discord", desc: "Click the invite link and Pantheon joins your Discord server. No bot tokens, no developer portal, no configuration. Just add and go." },
  { num: "03", title: "Your pantheon gets to work", desc: "Morning briefings. Task tracking. Email summaries. Follow-up reminders, communication tracking, and answers to whatever you ask. Your pantheon learns your operation and gets sharper every week." },
];

function StepVisual1() {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-[13px] text-accent font-semibold tracking-[1px] uppercase mb-1">Your Business Profile</div>
      <div className="hiw-field-box">
        <div className="hiw-field-label">INDUSTRY</div>
        <div className="text-[15px]">Professional Services</div>
      </div>
      <div className="hiw-field-box">
        <div className="hiw-field-label">FOCUS AREAS</div>
        <div className="flex gap-2 flex-wrap">
          <span className="hiw-tag">Client Projects</span>
          <span className="hiw-tag">Operations</span>
          <span className="hiw-tag">Finance</span>
        </div>
      </div>
      <div className="hiw-field-box">
        <div className="hiw-field-label">TOOLS</div>
        <div className="text-sm text-text-secondary leading-[1.7]">Gmail &middot; Google Drive &middot; Slack &middot; QuickBooks</div>
      </div>
      <div className="hiw-field-box">
        <div className="hiw-field-label">TEAM SIZE</div>
        <div className="text-[15px]">12 people</div>
      </div>
    </div>
  );
}

function StepVisual2() {
  return (
    <div className="flex flex-col gap-5 py-2.5">
      <div className="flex justify-center mb-2">
        <div className="w-16 h-16 rounded-2xl bg-discord-dim border-2 border-discord/30 flex items-center justify-center text-2xl text-discord">
          <svg width="28" height="22" viewBox="0 0 28 22" fill="currentColor"><path d="M23.7 1.8A23 23 0 0 0 18 0a.1.1 0 0 0-.1 0 16 16 0 0 0-.7 1.5 21.4 21.4 0 0 0-6.4 0A14.7 14.7 0 0 0 10 0h-.1A23 23 0 0 0 4.3 1.8 24 24 0 0 0 .1 16.9a23.3 23.3 0 0 0 7.1 3.6.1.1 0 0 0 .1 0 16 16 0 0 0 1.4-2.3.1.1 0 0 0 0-.1 15.3 15.3 0 0 1-2.4-1.2.1.1 0 0 1 0-.2l.5-.4h.1a16.6 16.6 0 0 0 14.2 0h.1l.5.4a.1.1 0 0 1 0 .2 14.4 14.4 0 0 1-2.4 1.2.1.1 0 0 0 0 .1c.4.8.9 1.6 1.4 2.3h.1a23.2 23.2 0 0 0 7.1-3.6A23.8 23.8 0 0 0 23.7 1.8zM9.3 13.9c-1.4 0-2.5-1.3-2.5-2.8S8 8.2 9.4 8.2s2.5 1.3 2.5 2.8-1.1 2.9-2.5 2.9zm9.3 0c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.9 2.5-2.9 2.5 1.3 2.5 2.8-1.1 2.9-2.5 2.9z" /></svg>
        </div>
      </div>

      <div className="hiw-discord-panel">
        <div className="text-[15px] font-semibold mb-3">Add to Server</div>
        <div className="text-xs text-text-dim mb-2 uppercase tracking-[1px]">SELECT A SERVER</div>
        <div className="hiw-server-select">
          <span className="text-sm text-text-primary">Acme Corp</span>
          <span className="text-[11px] text-text-dim">&#x25BC;</span>
        </div>
        <div className="text-xs text-text-dim mb-2 uppercase tracking-[1px]">PERMISSIONS</div>
        <div className="flex flex-col gap-1.5 mb-4">
          {["Send Messages", "Read Message History", "Embed Links"].map((p) => (
            <div key={p} className="text-[13px] text-text-secondary flex items-center gap-2">
              <span className="text-green-bright text-sm">&#x2713;</span> {p}
            </div>
          ))}
        </div>
        <div className="hiw-authorize-btn">
          Authorize
        </div>
      </div>

      <div className="hiw-success-bar">
        <span className="text-green-bright text-lg">&#x2713;</span>
        <span className="text-[13px] text-green-bright">Pantheon has been added to Acme Corp</span>
      </div>
    </div>
  );
}

function StepVisual3() {
  return (
    <div className="phone-mockup">
      <div className="phone-header">
        <div className="phone-avatar bg-accent-dim text-accent flex items-center justify-center text-sm font-bold">P</div>
        <div>
          <div className="phone-name">Pantheon</div>
          <div className="phone-status">online</div>
        </div>
      </div>
      <div className="phone-messages">
        <div className="phone-msg in"><strong>Morning Briefing</strong><br />3 tasks today. Vendor contract expires Friday. Client proposal draft is ready for review.</div>
        <div className="phone-msg in"><strong>Reminder: Q1 budget review at 10 AM</strong><br />Want me to pull last quarter&apos;s numbers?</div>
        <div className="phone-msg out">Yeah pull those up. And add &apos;review contractor invoices&apos; to my list</div>
        <div className="phone-msg in">Done. Last quarter&apos;s report is ready, and I added contractor invoice review to today&apos;s tasks.</div>
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
        <h2 className="section-title-display">Three minutes to set up. Your pantheon starts tomorrow.</h2>

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
