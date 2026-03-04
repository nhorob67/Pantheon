"use client";

import { m, LazyMotion, domAnimation } from "motion/react";

const benefits = [
  { icon: "#", title: "Organized by topic", desc: "#grain-bids, #weather, #equipment, #agronomy \u2014 organize by topic, by team, or however your operation runs." },
  { icon: "\u{1F465}", title: "Your whole team, free", desc: "Unlimited users at $0/month. Add operators, agronomists, and your grain buyer without a single per-seat charge." },
  { icon: "\u{1F512}", title: "Role-based access", desc: "Farm owner sees everything. Equipment operators see what they need. External agronomists see only agronomy. You set the lines." },
  { icon: "\u{1F4F1}", title: "Built for the field", desc: "Discord\u2019s mobile app uses 75% less data than alternatives and loads fast on any connection. Works on the combine, not just in the office." },
  { icon: "/", title: "Slash commands", desc: "Type /bids corn or /weather tomorrow and get instant answers. No hunting through old messages." },
  { icon: "\u221E", title: "Unlimited history", desc: "Every grain bid, weather alert, and conversation \u2014 searchable forever. Nothing gets buried or deleted after 90 days." },
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
          <div className="section-label">Your Farm&apos;s Command Center</div>
          <h2 className="section-title" style={{ margin: "0 auto" }}>Your operation&apos;s command center.</h2>
          <p className="section-sub" style={{ margin: "16px auto 0" }}>Discord gives your team organized channels, role-based access, and a platform that works in the tractor and the office. No per-user fees. No message limits.</p>
        </div>

        <div className="discord-grid">
          <div className="discord-mockup">
            <div className="discord-server-name">Johnson Farms</div>
            <div className="discord-channels">
              {["grain-bids", "weather", "equipment", "agronomy", "general"].map((ch) => (
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
                <span className="discord-role operator">Operator</span>
                <span className="discord-role agronomist">Agronomist</span>
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
