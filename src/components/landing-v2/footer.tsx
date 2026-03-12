import Link from "next/link";

export function FooterV2() {
  return (
    <footer className="v2-footer">
      <span>Pantheon // Nerd Out Inc // Fargo, ND</span>
      <div className="v2-footer-status">
        <span className="command-bar-status-dot" />
        <span>All Systems Operational</span>
      </div>
      <div className="v2-footer-links">
        <Link href="/docs">Docs</Link>
        <Link href="/login">Login</Link>
        <Link href="/signup">Deploy</Link>
      </div>
    </footer>
  );
}
