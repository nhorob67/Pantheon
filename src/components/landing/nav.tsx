"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, m, LazyMotion, domAnimation } from "motion/react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const links = [
    { href: "#platform", label: "Capabilities" },
    { href: "#team", label: "Your Team" },
    { href: "#how", label: "How It Works" },
    { href: "#pricing", label: "Pricing" },
  ];

  return (
    <>
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <Link href="#" className="nav-logo">Panthe<span>on</span></Link>
        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
          <Link href="/signup" className="nav-cta">Start Free Trial</Link>
        </div>
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </nav>

      <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {menuOpen && (
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="mobile-menu-overlay"
          >
            <button
              onClick={closeMenu}
              className="mobile-menu-close"
              aria-label="Close menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeMenu}
                className="mobile-menu-link"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/signup"
              onClick={closeMenu}
              className="cta-inscription mt-4"
            >
              Start Free Trial
            </Link>
          </m.div>
        )}
      </AnimatePresence>
      </LazyMotion>
    </>
  );
}
