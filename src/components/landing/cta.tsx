import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="final-cta">
      <h2>Put AI to work<br /><em>on your farm.</em></h2>
      <p>Sign up in 5 minutes. Get your first grain bids tomorrow morning.</p>
      <Link href="/signup" className="btn-primary">Set Up My Farm Assistant</Link>
    </section>
  );
}
