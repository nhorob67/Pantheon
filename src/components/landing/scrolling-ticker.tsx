"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

const tickerItems = [
  "What do I need to get done this week?",
  "Who sent that proposal I haven't responded to?",
  "What's the status on the client deliverable?",
  "Add 'review Q1 budget' to my task list",
  "Summarize the vendor's last three emails",
  "Remind me to follow up with the accounting team",
  "Who do I still need to get back to?",
  "What deadlines are coming up this month?",
  "What emails came in while I was in meetings?",
  "What did the contractor quote us on the project?",
  "Walk me through our onboarding procedure",
  "Compare the proposals from our three vendors",
  "What are my open action items from yesterday?",
  "Draft a response to the partnership inquiry",
  "What did we decide in last week's team meeting?",
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
