import Link from "next/link";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-badge">
        <span className="dot" style={{ background: "var(--green-bright)" }} />
        AI that works your farm
      </div>
      <h1>An AI team that actually knows<br /><em>your operation.</em></h1>
      <p className="hero-sub">FarmClaw gives your farm a team of AI assistants — configured around your crops, your county, your elevators, and whatever else your operation needs to stay on top of. Grain bids, weather, agronomy, compliance, equipment — just ask.</p>
      <div className="hero-actions">
        <Link href="/signup" className="btn-primary">Start My Free Trial</Link>
        <Link href="#how" className="btn-secondary">See How It Works</Link>
      </div>
    </section>
  );
}
