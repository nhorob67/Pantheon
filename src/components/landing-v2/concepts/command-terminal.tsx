"use client";

const COMMANDS = [
  { deity: "athena", text: "deploying to #strategy-room" },
  { deity: "hermes", text: "routing inbound from support@acme.co" },
  { deity: "apollo", text: "research sweep — 14 sources indexed" },
  { deity: "artemis", text: "tracking anomaly in conversion funnel" },
  { deity: "hephaestus", text: "building skill: invoice-parser v2" },
  { deity: "ares", text: "executing ops runbook — step 3/7" },
  { deity: "athena", text: "delegating brief to apollo" },
  { deity: "hermes", text: "sending digest to #daily-standup" },
];

export function CommandTerminal() {
  const charCounts = COMMANDS.map((c) => c.deity.length + 1 + c.text.length);

  return (
    <div className="terminal-concept">
      {/* Terminal chrome */}
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="terminal-dot terminal-dot-red" />
          <span className="terminal-dot terminal-dot-yellow" />
          <span className="terminal-dot terminal-dot-green" />
        </div>
        <span className="terminal-title">PANTHEON RUNTIME</span>
      </div>

      {/* Scanline overlay */}
      <div className="terminal-scanline" aria-hidden="true" />

      {/* Command lines */}
      <div className="terminal-body-concept">
        {COMMANDS.map((cmd, i) => (
          <div
            key={i}
            className="terminal-line"
            style={{
              "--char-count": charCounts[i],
              "--line-delay": `${i * 2.5}s`,
            } as React.CSSProperties}
          >
            <span className="terminal-prompt">{">"}</span>
            <span className="terminal-typed">
              <span className="terminal-deity">{cmd.deity}</span>
              {" "}
              {cmd.text}
            </span>
          </div>
        ))}
        {/* Cursor */}
        <div className="terminal-cursor-line">
          <span className="terminal-prompt">{">"}</span>
          <span className="terminal-cursor" />
        </div>
      </div>
    </div>
  );
}
