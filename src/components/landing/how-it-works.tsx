"use client";

import { useState, useCallback } from "react";
import { m, LazyMotion, domAnimation, AnimatePresence } from "motion/react";
import { REVEAL_SLOW } from "./motion-config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const steps = [
  { numeral: "I", title: "Tell us about your work", desc: "Industry, focus areas, tools you use, and what you need help with. Task tracking, SOPs, email, research, whatever your business demands. Takes about 3 minutes." },
  { numeral: "II", title: "Add Pantheon to Discord", desc: "Click the invite link and Pantheon joins your Discord server. No bot tokens, no developer portal, no configuration. Just add and go." },
  { numeral: "III", title: "Your agents get to work — together", desc: "Each agent handles its domain: one triages email, another tracks tasks, a third monitors deadlines. They coordinate in Discord so nothing falls through the cracks. Your pantheon learns your operation and gets sharper every week." },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const reduced = useReducedMotion();

  const handleKeyDown = useCallback((e: React.KeyboardEvent, i: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActiveStep(i);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      setActiveStep(Math.min(i + 1, steps.length - 1));
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      setActiveStep(Math.max(i - 1, 0));
    }
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="how-section"
        id="how"
        initial={reduced ? undefined : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={reduced ? { duration: 0 } : REVEAL_SLOW}
      >
        <div className="section-label">How It Works</div>
        <h2 className="section-title-display">Three minutes to set up. Your pantheon starts tomorrow.</h2>

        <div className="how-steps-list" role="tablist" aria-label="Setup steps">
          {steps.map((step, i) => (
            <div
              key={step.numeral}
              className={`how-step ${activeStep === i ? "active" : ""}`}
              role="tab"
              tabIndex={activeStep === i ? 0 : -1}
              aria-selected={activeStep === i}
              aria-controls={`how-panel-${i}`}
              onClick={() => setActiveStep(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
            >
              <div className="how-step-header">
                <div className="how-step-num">{step.numeral}</div>
                <div className="how-step-title">{step.title}</div>
              </div>
              <AnimatePresence>
                {activeStep === i && (
                  <m.div
                    id={`how-panel-${i}`}
                    role="tabpanel"
                    className="how-step-desc"
                    initial={reduced ? undefined : { maxHeight: 0, opacity: 0 }}
                    animate={{ maxHeight: 200, opacity: 1, marginTop: 12 }}
                    exit={reduced ? undefined : { maxHeight: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: reduced ? 0 : 0.6 }}
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
