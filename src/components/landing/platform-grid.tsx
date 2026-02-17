const tiles = [
  { icon: "🌾", title: "Cash Grain Bids", desc: "Live bids from your elevators, every morning at 9 AM. Compare basis across locations instantly." },
  { icon: "⛅", title: "Weather Intelligence", desc: "Morning briefings, spray windows, severe alerts, GDD tracking. All from the National Weather Service." },
  { icon: "📊", title: "Market Analysis", desc: "Futures context, basis trends, WASDE summaries. Make sense of what's moving and why." },
  { icon: "📋", title: "Deadlines & Programs", desc: "Crop insurance, FSA signup, prevent plant. Never miss a deadline again." },
  { icon: "💰", title: "Break-Even Analysis", desc: "Input costs vs. current bids. Know your numbers before you make the call." },
  { icon: "🚜", title: "Equipment & Ops", desc: "Maintenance schedules, parts lookups, service reminders. Keep your iron running." },
  { icon: "✍️", title: "Draft & Communicate", desc: "Landlord messages, FSA letters, marketing plans. Write it in 10 seconds instead of 10 minutes." },
  { icon: "✦", title: "Whatever's Next", desc: "Satellite imagery. Livestock. Precision ag data. If it helps your operation, we're building it.", special: true },
];

export function PlatformGrid() {
  return (
    <section className="platform-section" id="platform">
      <div className="section-label">Your Assistant&apos;s Skills</div>
      <h2 className="section-title" style={{ margin: "0 auto" }}>It grows with your operation.</h2>
      <p className="section-sub" style={{ margin: "16px auto 0" }}>FarmClaw starts with grain bids and weather. But underneath is a full AI assistant that can handle new tasks as fast as we can add them — and we&apos;re adding fast.</p>

      <div className="platform-grid">
        {tiles.map((tile) => (
          <div key={tile.title} className="platform-tile" style={tile.special ? { background: "var(--accent-dim)" } : undefined}>
            <span className="tile-icon">{tile.icon}</span>
            <h3 style={tile.special ? { color: "var(--accent)" } : undefined}>{tile.title}</h3>
            <p style={tile.special ? { color: "var(--text-secondary)" } : undefined}>{tile.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
