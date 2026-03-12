"use client";

import { m, LazyMotion, domAnimation } from "motion/react";
import { Shield } from "lucide-react";

export function SocialProof() {
  return (
    <LazyMotion features={domAnimation}>
      <m.section
        className="quote-section"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <div className="section-label">Who Built This</div>
        <div className="quote-text">Every business runs a complex operation out of text threads and apps that don&apos;t talk to each other.</div>
        <div className="quote-sub">Your vendor needs an answer on pricing. Your new hire has a question about the onboarding process. A client is waiting on a proposal. Your accountant needs documents by Friday. And you&apos;re trying to make real decisions while all of this lands on your phone.</div>
        <div className="quote-sub">After years of building software for operators &mdash; people who run things, make decisions, and keep teams moving &mdash; I realized the daily grind of routing information wears you down just as much as the big decisions. Every operator I&apos;ve worked with is running a sophisticated business out of text threads, sticky notes, and a patchwork of apps that don&apos;t talk to each other.</div>
        <div className="quote-sub">We named it Pantheon for a reason. In the old stories, a pantheon wasn&apos;t one all-powerful god &mdash; it was a team of specialists, each governing their own domain, each doing what they do best. That&apos;s exactly what your business needs. Not one AI that tries to do everything. A team of them &mdash; one that tracks your tasks, one that watches your email, one that handles research &mdash; each in their own lane, all working together. And unlike every other AI tool out there, your whole human team gets access too. No per-seat fees. No single-user licenses. One pantheon, for everyone.</div>
        <div className="quote-attr">NICK HOROB &middot; Fargo, ND</div>
        <div className="quote-guarantee">
          <Shield size={18} />
          If it doesn&apos;t save you time, cancel anytime. No questions.
        </div>
      </m.section>
    </LazyMotion>
  );
}
