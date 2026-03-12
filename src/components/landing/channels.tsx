"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

const benefits = [
  { icon: "#", title: "Organized by topic", desc: "#operations for your team, #research for market intel, #client-projects for active work. Everyone gets what they need without everything going through you." },
  { icon: "\u{1F465}", title: "Your whole team, free", desc: "Unlimited users at $0/month. Add employees, contractors, and partners without a single per-seat charge." },
  { icon: "\u{1F512}", title: "Role-based access", desc: "Owner sees everything. Managers see what they need. Contractors see only their projects. Guests see only what you share. You set the lines." },
  { icon: "\u{1F4F1}", title: "Works everywhere", desc: "Discord\u2019s mobile app uses 75% less data than alternatives and loads fast on any connection. Works in the field, not just in the office." },
  { icon: "/", title: "Slash commands", desc: "Type /tasks today or /sop onboarding and get instant answers. No hunting through old messages." },
  { icon: "\u221E", title: "Unlimited history", desc: "Every task, procedure, research result, and conversation, searchable forever. Nothing gets buried or deleted after 90 days." },
];

export function Channels() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="channels-section"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <div style={{ textAlign: "center" as const }}>
          <div className="section-label">Your Command Center</div>
          <h2 className="section-title" style={{ margin: "0 auto" }}>Stop routing everything through your phone.</h2>
          <p className="section-sub" style={{ margin: "16px auto 0" }}>Give your team, your partners, and your pantheon their own channels. The right people see the right information, and you stop being the middleman for every question. No per-user fees. No message limits.</p>
        </div>

        <div className="discord-grid">
          <div className="discord-mockup">
            <div className="discord-server-name">Acme Corp</div>
            <div className="discord-channels">
              {["general", "operations", "research", "client-projects", "finance"].map((ch) => (
                <div key={ch} className="discord-channel">
                  <span className="discord-hash">#</span>
                  {ch}
                </div>
              ))}
            </div>
            <div className="discord-roles">
              <div className="discord-role-label">ROLES</div>
              <div className="discord-role-list">
                <span className="discord-role owner">Owner</span>
                <span className="discord-role manager">Manager</span>
                <span className="discord-role operator">Contractor</span>
                <span className="discord-role agronomist">Guest</span>
              </div>
            </div>
          </div>

          <div className="discord-benefits">
            {benefits.map((b, i) => (
              <m.div
                key={b.title}
                className="discord-benefit-card"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <span className="discord-benefit-icon">{b.icon}</span>
                <div>
                  <h3>{b.title}</h3>
                  <p>{b.desc}</p>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      </m.section>
    </LazyMotion>
  );
}
