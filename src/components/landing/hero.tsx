import Link from "next/link";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-badge">
        <span className="dot" />
        Powered by OpenClaw
      </div>
      <h1>Text it anything.<br /><em>About your farm.</em></h1>
      <p className="hero-sub">Grain bids from your elevators at 9 AM. Weather briefing at 6 AM. Spray windows, market analysis, and anything else — right in your farm&apos;s Discord server, on any device.</p>
      <div className="hero-actions">
        <Link href="/signup" className="btn-primary">Set Up My Farm Assistant</Link>
        <Link href="#skills" className="btn-secondary">See What It Can Do</Link>
      </div>
    </section>
  );
}
