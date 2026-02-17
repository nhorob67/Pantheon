import Link from "next/link";

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-logo">Farm<span>Claw</span></div>
      <div className="footer-links">
        {["Pricing", "FAQ", "Privacy", "Terms", "Contact"].map((link) => (
          <Link key={link} href="#">{link}</Link>
        ))}
      </div>
      <div className="footer-copy">© 2026 Nerd Out Inc. All rights reserved.</div>
    </footer>
  );
}
