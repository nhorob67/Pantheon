import Link from "next/link";

function DiscordMark() {
  return (
    <svg width="16" height="12" viewBox="0 0 71 55" fill="currentColor" aria-hidden="true">
      <path d="M60.1 4.9A58.5 58.5 0 0 0 45.4.2a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37 37 0 0 0 25.4.3a.2.2 0 0 0-.2-.1A58.4 58.4 0 0 0 10.5 5a.2.2 0 0 0-.1 0A59.7 59.7 0 0 0 .2 45.3a.2.2 0 0 0 .1.2A58.8 58.8 0 0 0 18 54.8a.2.2 0 0 0 .3-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.8 38.8 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.9a.2.2 0 0 1 .2 0 42 42 0 0 0 35.8 0 .2.2 0 0 1 .2 0l1.1.9a.2.2 0 0 1 0 .3 36.4 36.4 0 0 1-5.5 2.7.2.2 0 0 0-.1.3 47.2 47.2 0 0 0 3.6 5.9.2.2 0 0 0 .3.1A58.6 58.6 0 0 0 70.3 45.4a.2.2 0 0 0 0-.2A59.2 59.2 0 0 0 60.2 5a.2.2 0 0 0-.1 0ZM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.1 6.4-7.1 6.5 3.2 6.4 7.1c0 4-2.8 7.2-6.4 7.2Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.1 6.4-7.1 6.5 3.2 6.4 7.1c0 4-2.8 7.2-6.4 7.2Z" />
    </svg>
  );
}

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
        <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="v2-footer-discord">
          <DiscordMark />
          <span>Powered by Discord</span>
        </a>
        <Link href="/login">Login</Link>
        <Link href="/signup">Deploy</Link>
      </div>
    </footer>
  );
}
