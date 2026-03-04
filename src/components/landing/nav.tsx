"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
      <Link href="#" className="nav-logo">Farm<span>Claw</span></Link>
      <div className="nav-links">
        <Link href="#skills">What It Does</Link>
        <Link href="#how">How It Works</Link>
        <Link href="#trust">Your Data</Link>
        <Link href="#pricing">Pricing</Link>
        <Link href="/signup" className="nav-cta">Get Started</Link>
      </div>
    </nav>
  );
}
