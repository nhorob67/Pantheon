const benefits = [
  { icon: "#", title: "Organized by topic", desc: "#grain-bids, #weather, #equipment, #agronomy — each conversation stays in its lane instead of one noisy chat." },
  { icon: "👥", title: "Your whole team, free", desc: "Unlimited users at $0/month. Add operators, agronomists, and your grain buyer without a single per-seat charge." },
  { icon: "🔒", title: "Role-based access", desc: "Farm owner sees everything. Equipment operators see what they need. External agronomists see only agronomy. You set the lines." },
  { icon: "📱", title: "Built for the field", desc: "Discord\u2019s mobile app uses 75% less data than alternatives and loads fast on any connection. Works on the combine, not just in the office." },
  { icon: "/", title: "Slash commands", desc: "Type /bids corn or /weather tomorrow and get instant answers. No hunting through old messages." },
  { icon: "∞", title: "Unlimited history", desc: "Every grain bid, weather alert, and conversation — searchable forever. Nothing gets buried or deleted after 90 days. Your data is stored in your account, exportable anytime." },
];

export function Channels() {
  return (
    <section className="channels-section">
      <div style={{ textAlign: "center" as const }}>
        <div className="section-label">Your Farm&apos;s Command Center</div>
        <h2 className="section-title" style={{ margin: "0 auto" }}>One server. Every channel your operation needs.</h2>
        <p className="section-sub" style={{ margin: "16px auto 0" }}>Discord gives your team organized channels, role-based access, and a free platform that works as well in the tractor as it does in the office. No per-user fees. No message limits. Ever. And every conversation is yours to search and export.</p>
      </div>

      <div className="discord-grid">
        {/* Left: Discord server mockup */}
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

        {/* Right: Benefit cards */}
        <div className="discord-benefits">
          {benefits.map((b) => (
            <div key={b.title} className="discord-benefit-card">
              <span className="discord-benefit-icon">{b.icon}</span>
              <div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
