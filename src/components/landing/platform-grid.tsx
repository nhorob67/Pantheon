const tiles: { title: string; desc: string; special?: boolean }[] = [
  { title: "Task Management", desc: "Daily to-do lists, reminders, and follow-ups. Tell your assistant what needs doing. It tracks everything and nudges you when things are due." },
  { title: "SOPs & Procedures", desc: "Step-by-step checklists for any process. Employee onboarding, client intake, safety protocols. Always consistent, always available." },
  { title: "Email Intelligence", desc: "Summarize threads, surface overdue replies, draft responses. Your AI team reads your inbox so you don't have to." },
  { title: "Research & Analysis", desc: "Competitive intel, vendor comparisons, market data. Ask a question, get a sourced answer." },
  { title: "Scheduling & Deadlines", desc: "Contract renewals, compliance filings, project milestones. Never miss a deadline again." },
  { title: "Communication Tracking", desc: "Who you need to get back to, what was promised, and what's overdue. Every thread, every contact." },
  { title: "Document Processing", desc: "Upload contracts, proposals, and reports. Your AI team reads, summarizes, and extracts what matters." },
  { title: "Whatever's Next", desc: "Custom skills, new integrations, your own procedures. If your business needs it, your AI team can learn it.", special: true },
];

export function PlatformGrid() {
  return (
    <section className="platform-section" id="platform">
      <div className="section-label">Capabilities</div>
      <h2 className="section-title" style={{ margin: "0 auto" }}>It grows with your business.</h2>
      <p className="section-sub" style={{ margin: "16px auto 0" }}>Tasks, SOPs, email, research, scheduling, communication tracking. Your AI team handles it all. And you can teach it new procedures specific to your operation.</p>

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
