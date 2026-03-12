"use client";

import { useState } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";
import { REVEAL_SLOW } from "./motion-config";

const steps = [
  { numeral: "I", title: "Tell us about your work", desc: "Industry, focus areas, tools you use, and what you need help with. Task tracking, SOPs, email, research, whatever your business demands. Takes about 3 minutes." },
  { numeral: "II", title: "Add Pantheon to Discord", desc: "Click the invite link and Pantheon joins your Discord server. No bot tokens, no developer portal, no configuration. Just add and go." },
  { numeral: "III", title: "Your pantheon gets to work", desc: "Morning briefings. Task tracking. Email summaries. Follow-up reminders, communication tracking, and answers to whatever you ask. Your pantheon learns your operation and gets sharper every week." },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="how-section"
        id="how"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={REVEAL_SLOW}
      >
        <div className="section-label">How It Works</div>
        <h2 className="section-title-display">Three minutes to set up. Your pantheon starts tomorrow.</h2>

        <div className="how-steps-list">
          {steps.map((step, i) => (
            <div key={step.numeral} className={`how-step ${activeStep === i ? "active" : ""}`} onClick={() => setActiveStep(i)}>
              <div className="how-step-header">
                <div className="how-step-num">{step.numeral}</div>
                <div className="how-step-title">{step.title}</div>
              </div>
              <AnimatePresence>
                {activeStep === i && (
                  <m.div
                    className="how-step-desc"
                    initial={{ maxHeight: 0, opacity: 0 }}
                    animate={{ maxHeight: 200, opacity: 1, marginTop: 12 }}
                    exit={{ maxHeight: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    {step.desc}
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </m.section>
    </LazyMotion>
  );
}
