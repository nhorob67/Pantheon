const trustCards = [
  {
    icon: "🔒",
    title: "Your data is walled off",
    body: "Every farm gets its own isolated data partition. Your grain bids, scale tickets, and conversations are never visible to other customers — not even accidentally. We enforce this at the database level, not just the application level.",
  },
  {
    icon: "📥",
    title: "Export everything. Anytime.",
    body: "Your scale tickets, conversation history, and farm profile are yours. Export them as CSV or JSON from your dashboard whenever you want. If you cancel, your data stays available for 30 days to download. No hostage situations.",
  },
  {
    icon: "🔑",
    title: "Cancel in two clicks",
    body: "Monthly billing. No annual contracts. No setup fees. No cancellation fees. If FarmClaw doesn\u2019t save you time, cancel from your dashboard. We\u2019ll keep your data available for 30 days so you can export anything you need.",
  },
];

export function TrustSection() {
  return (
    <section className="trust-section" id="trust">
      <div style={{ textAlign: "center" as const }}>
        <div className="section-label">Your Data, Your Farm</div>
        <h2 className="section-title" style={{ margin: "0 auto" }}>Your neighbor can&apos;t see your bids. And we can&apos;t lock you in.</h2>
        <p className="section-sub" style={{ margin: "16px auto 0" }}>FarmClaw runs on shared infrastructure, but your data is completely isolated. Every query, every scale ticket, every conversation is separated at the database level.</p>
      </div>

      <div className="trust-grid">
        {trustCards.map((card) => (
          <div key={card.title} className="trust-card">
            <span className="trust-icon">{card.icon}</span>
            <div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
