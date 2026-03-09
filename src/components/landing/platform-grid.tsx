const tiles: { title: string; desc: string; special?: boolean }[] = [
  { title: "Task Tracking", desc: "Daily to-do lists, reminders, and follow-ups. Tell your assistant what needs doing — it tracks everything and nudges you when things are due." },
  { title: "SOPs & Procedures", desc: "Step-by-step checklists for any operation. Anhydrous safety, planting procedures, harvest protocols. Always consistent, always available." },
  { title: "Weather Intelligence", desc: "Morning briefings, spray windows, severe alerts, GDD tracking. All from the National Weather Service." },
  { title: "Grain Bids & Marketing", desc: "Cash bids from your elevators, basis tracking, and market context. Compare across locations instantly." },
  { title: "Scale Tickets", desc: "Log deliveries by photo, voice, or text. Running totals by crop, elevator, and season." },
  { title: "Deadlines & Compliance", desc: "Crop insurance, FSA signup, prevent plant, acreage reports. Never miss a deadline again." },
  { title: "Equipment & Ops", desc: "Maintenance schedules, parts lookups, service reminders. Keep your iron running." },
  { title: "Whatever's Next", desc: "Custom skills, new integrations, your own procedures. If your operation needs it, your AI team can learn it.", special: true },
];

export function PlatformGrid() {
  return (
    <section className="platform-section" id="platform">
      <div className="section-label">Your Assistant&apos;s Skills</div>
      <h2 className="section-title" style={{ margin: "0 auto" }}>It grows with your operation.</h2>
      <p className="section-sub" style={{ margin: "16px auto 0" }}>Task lists, SOPs, weather, grain marketing, compliance — your AI team handles it all. And you can teach it new procedures specific to your operation.</p>

      <div className="platform-grid">
        {tiles.map((tile) => (
          <div key={tile.title} className="platform-tile" style={tile.special ? { background: "var(--accent-dim)" } : undefined}>
            <h3 style={tile.special ? { color: "var(--accent)" } : undefined}>{tile.title}</h3>
            <p style={tile.special ? { color: "var(--text-secondary)" } : undefined}>{tile.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
