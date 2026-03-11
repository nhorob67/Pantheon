"use client";

import { useState, useSyncExternalStore } from "react";
import { MessageSquare, X, ExternalLink, ChevronDown } from "lucide-react";

const DISMISS_KEY = "fc_discord_banner_dismissed";
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

function subscribeDismiss(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getDismissSnapshot() {
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

function getDismissServerSnapshot() {
  return true; // hide on server to avoid hydration mismatch
}

export function DiscordSetupBanner({
  hasLinkedChannels,
}: {
  hasLinkedChannels: boolean;
}) {
  const dismissed = useSyncExternalStore(
    subscribeDismiss,
    getDismissSnapshot,
    getDismissServerSnapshot,
  );
  const [channelIdOpen, setChannelIdOpen] = useState(false);

  if (hasLinkedChannels || dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    window.dispatchEvent(new StorageEvent("storage"));
  }

  const oauthUrl = DISCORD_CLIENT_ID
    ? `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=117760&scope=bot`
    : null;

  return (
    <div className="bg-bg-card rounded-xl border border-border border-l-[3px] border-l-[#5865F2] shadow-sm p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-5 w-5 text-[#5865F2] shrink-0" />
          <h3 className="font-headline text-base font-semibold text-text-primary">
            Connect Your Discord Server
          </h3>
        </div>
        <button
          onClick={handleDismiss}
          className="text-text-secondary hover:text-text-primary transition-colors p-1 -m-1"
          aria-label="Dismiss Discord setup guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-text-secondary mt-1 ml-[30px]">
        Link your Discord server so your AI assistants can respond in your
        channels.
      </p>

      {/* Steps */}
      <div className="mt-4 space-y-4 ml-[30px]">
        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#5865F2]/15 text-[#5865F2] text-xs font-bold shrink-0">
            1
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Add the Pantheon Bot to Your Server
            </p>
            <p className="text-xs text-text-dim mt-0.5">
              Click below to invite the bot. You&apos;ll need &ldquo;Manage
              Server&rdquo; permission in Discord.
            </p>
            {oauthUrl ? (
              <a
                href={oauthUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors mt-2.5"
              >
                Invite Bot
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="text-xs text-amber-500 mt-2">
                Discord client ID not configured. Contact support.
              </p>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#5865F2]/15 text-[#5865F2] text-xs font-bold shrink-0">
            2
          </span>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Assign a Channel to an Assistant
            </p>
            <p className="text-xs text-text-dim mt-0.5">
              Edit any assistant below and paste a Discord Channel ID to bind it.
            </p>

            {/* Expandable help */}
            <button
              onClick={() => setChannelIdOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors mt-2"
              aria-expanded={channelIdOpen}
            >
              How to find a Channel ID
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${channelIdOpen ? "rotate-180" : ""}`}
              />
            </button>
            {channelIdOpen && (
              <ol className="mt-2 space-y-1 text-xs text-text-dim list-decimal list-inside">
                <li>Open Discord Settings &gt; Advanced &gt; enable Developer Mode</li>
                <li>Right-click the channel you want</li>
                <li>Click &ldquo;Copy Channel ID&rdquo;</li>
                <li>Paste it when editing an assistant</li>
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
