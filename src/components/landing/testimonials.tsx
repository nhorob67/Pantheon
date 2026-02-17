import Link from "next/link";

export function SocialProof() {
  return (
    <section className="quote-section">
      <div className="section-label">Early Access</div>
      <div className="quote-text">Built by the team behind <em>AI on Your Farm</em>. We&apos;re onboarding the first 50 farms now.</div>
      <div className="quote-sub">Try it for 30 days — if it doesn&apos;t save you time, cancel. No questions asked.</div>
      <Link href="/signup" className="btn-primary" style={{ marginTop: 24 }}>Claim Your Spot</Link>
    </section>
  );
}
