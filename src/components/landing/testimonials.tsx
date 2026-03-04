import Link from "next/link";

export function SocialProof() {
  return (
    <section className="quote-section">
      <div className="section-label">Who Built This</div>
      <div className="quote-text">Built by a farmer&apos;s kid who got tired of checking 6 websites before breakfast.</div>
      <div className="quote-sub">FarmClaw is built in Fargo, ND by a team that grew up on Upper Midwest row crop operations. We built this because we watched our families juggle elevator websites, weather apps, USDA reports, and text threads — every single morning — just to make decisions they could have made in one conversation.</div>
      <div className="quote-guarantee">Try it for 30 days. If it doesn&apos;t save you time, cancel. No questions. No hassle.</div>
      <Link href="/signup" className="btn-primary" style={{ marginTop: 24 }}>Start My Free Trial</Link>
    </section>
  );
}
