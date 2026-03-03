import Link from "next/link";

export function Nav() {
  return (
    <nav className="landing-nav">
      <Link href="#" className="nav-logo">Farm<span>Claw</span></Link>
      <div className="nav-links">
        <Link href="#skills">What It Does</Link>
        <Link href="#how">How It Works</Link>
        <Link href="#trust">Your Data</Link>
        <Link href="#pricing">Pricing</Link>
        <Link href="/signup" className="nav-cta">Start My Free Trial</Link>
      </div>
    </nav>
  );
}
