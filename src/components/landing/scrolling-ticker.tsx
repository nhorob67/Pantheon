"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

const tickerItems = [
  "What's corn at CHS today?",
  "Spray window tomorrow morning?",
  "Compare soybean basis across my elevators",
  "When does crop insurance signup close?",
  "Break-even on corn at current input costs?",
  "Summarize yesterday's WASDE report",
  "Draft a message to my landlord about rent",
  "GDD accumulation since May 1?",
  "Any severe weather alerts for Cass County?",
  "What equipment maintenance is due this month?",
  "Walk me through ARC-CO vs PLC for my county",
  "What's the 10-day forecast look like?",
  "How many bushels have I delivered this season?",
  "Pull up my scale tickets from last week",
  "What did Dec corn close at yesterday?",
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
