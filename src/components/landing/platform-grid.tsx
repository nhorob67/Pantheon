import { StatusIndicator } from "./deity-marks";

const tiles: { title: string; desc: string }[] = [
  { title: "Task Management", desc: "Daily to-do lists, reminders, and follow-ups. Tell your assistant what needs doing. It tracks everything and nudges you when things are due." },
  { title: "SOPs & Procedures", desc: "Step-by-step checklists for any process. Employee onboarding, client intake, safety protocols. Always consistent, always available." },
  { title: "Email Intelligence", desc: "Summarize threads, surface overdue replies, draft responses. Your pantheon reads your inbox so you don't have to." },
  { title: "Research & Analysis", desc: "Competitive intel, vendor comparisons, market data. Ask a question, get a sourced answer." },
  { title: "Scheduling & Deadlines", desc: "Contract renewals, compliance filings, project milestones. Never miss a deadline again." },
  { title: "Communication Tracking", desc: "Who you need to get back to, what was promised, and what's overdue. Every thread, every contact." },
  { title: "Document Processing", desc: "Upload contracts, proposals, and reports. Your pantheon reads, summarizes, and extracts what matters." },
  { title: "Whatever's Next", desc: "Custom skills, new integrations, your own procedures. If your business needs it, your pantheon can learn it." },
];

export function PlatformGrid() {
  return (
    <section className="platform-section" id="platform">
      <div className="section-label">Capabilities</div>
      <h2 className="section-title mx-auto">Your pantheon grows with your business.</h2>
      <p className="section-sub mx-auto mt-4">Tasks, SOPs, email, research, scheduling, communication tracking. Your pantheon handles it all. And you can teach it new procedures specific to your operation.</p>

      <div className="platform-grid">
        {tiles.map((tile) => (
          <div key={tile.title} className="platform-tile">
            <h3><StatusIndicator className="platform-tile-indicator" /> {tile.title}</h3>
            <p>{tile.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
