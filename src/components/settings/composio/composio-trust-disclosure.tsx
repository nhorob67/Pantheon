import React from "react";

export function ComposioTrustDisclosure() {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5 text-foreground/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </div>
        <div>
          <h4 className="font-headline text-sm font-semibold text-foreground mb-2">
            Privacy &amp; Security
          </h4>
          <ul className="space-y-1.5 text-foreground/50 text-xs leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-foreground/30 mt-0.5">&#8226;</span>
              Service credentials are encrypted with AES-256-GCM and never
              stored on Pantheon servers.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground/30 mt-0.5">&#8226;</span>
              Composio acts as a secure proxy — your assistant accesses services
              through authorized API calls only.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground/30 mt-0.5">&#8226;</span>
              Disconnecting a service immediately revokes all access and
              removes stored tokens.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
