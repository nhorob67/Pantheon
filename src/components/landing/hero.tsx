import Link from "next/link";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-badge">
        <span className="dot" style={{ background: "var(--green-bright)" }} />
        Your morning bids. Tomorrow.
      </div>
      <h1>Your elevators, your weather, your farm.<br /><em>One conversation.</em></h1>
      <p className="hero-sub">CHS, ADM, Cargill — whatever elevators you sell to, FarmClaw pulls their cash bids every morning at 9 AM and posts them in your Discord. Weather at 6 AM. Spray windows, basis trends, scale tickets, and anything else your operation throws at it.</p>
      <div className="hero-actions">
        <Link href="/signup" className="btn-primary">Start My Free Trial</Link>
        <Link href="#skills" className="btn-secondary">See What It Can Do</Link>
      </div>
    </section>
  );
}
