import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="final-cta">
      <h2>Put AI to work<br /><em>on your farm.</em></h2>
      <p>Three minutes to set up. Grain bids in your Discord tomorrow at 9 AM.</p>
      <div className="final-cta-trust">No lock-in. Export your data anytime.</div>
      <Link href="/signup" className="btn-primary">Start My Free Trial</Link>
    </section>
  );
}
