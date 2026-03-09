"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

const tickerItems = [
  "What do I need to get done this week?",
  "Walk me through the pre-emerge spray procedure",
  "Spray window tomorrow morning?",
  "Add 'call seed dealer' to my to-do list",
  "What's corn at CHS today?",
  "Any severe weather alerts for Cass County?",
  "What's the procedure for anhydrous application?",
  "What equipment maintenance is due this month?",
  "When does crop insurance signup close?",
  "Mark the tile drainage inspection as done",
  "What did I tell you about the NE quarter last fall?",
  "What's the 10-day forecast look like?",
  "Compare soybean basis across my elevators",
  "What are my open tasks for planting season?",
  "Walk me through ARC-CO vs PLC for my county",
];

export function ScrollingTicker() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="ticker-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={`${i}-${item}`} className="ticker-item">{item}</span>
          ))}
        </div>
      </m.div>
    </LazyMotion>
  );
}
