"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

const tickerItems = [
  "What do I need to get done this week?",
  "What did my seed rep send over last week?",
  "Spray window tomorrow morning?",
  "Add 'call seed dealer' to my to-do list",
  "What's corn at CHS today?",
  "Summarize the agronomist's recommendations",
  "Remind me to call back the crop insurance agent",
  "Who do I still need to get back to this week?",
  "When does crop insurance signup close?",
  "What emails came in while I was in the field?",
  "What did the equipment dealer quote me on parts?",
  "What's the 10-day forecast look like?",
  "Compare soybean basis across my elevators",
  "What are my open tasks for planting season?",
  "Any severe weather alerts for Cass County?",
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
