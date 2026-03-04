import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="final-cta">
      <h2>Put your AI team<br /><em>to work.</em></h2>
      <p>Three minutes to set up. Your first briefing hits Discord tomorrow morning.</p>
      <div className="final-cta-trust">No lock-in. Export your data anytime.</div>
      <Link href="/signup" className="btn-primary">Start My Free Trial</Link>
    </section>
  );
}
