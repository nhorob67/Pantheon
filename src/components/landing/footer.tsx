import Link from "next/link";

export function Footer() {
  return (
    <footer className="landing-footer">
      <div>
        <div className="footer-logo">Panthe<span>on</span></div>
        <div className="footer-built">Built in Fargo, ND</div>
      </div>
      <div className="footer-status">All systems operational. 12 agents standing by.</div>
      <div className="footer-links">
        {["Pricing", "FAQ", "Privacy", "Terms", "Contact"].map((link) => (
          <Link key={link} href="#">{link}</Link>
        ))}
      </div>
      <div className="footer-copy">&copy; 2026 Nerd Out Inc. All rights reserved.</div>
    </footer>
  );
}
