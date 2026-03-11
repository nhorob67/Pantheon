"use client";

import Link from "next/link";
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
        <div className="quote-sub">Pantheon gives you AI agents that know your operation, track your tasks and communication, watch your deadlines, and keep everything organized in one place. So you can stop being the middleman for every question and start running your business.</div>
        <div className="quote-attr">NICK HOROB &middot; Fargo, ND</div>
        <div className="quote-guarantee">
          <Shield size={18} />
          If it doesn&apos;t save you time, cancel anytime. No questions.
        </div>
        <div style={{ marginTop: 32 }}>
          <Link href="/signup" className="btn-primary">Get Started</Link>
        </div>
      </m.section>
    </LazyMotion>
  );
}
