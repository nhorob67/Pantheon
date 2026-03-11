"use client";

import { useOnboardingOperation, useOnboardingLocation, useOnboardingDiscord, useOnboardingActions } from "@/hooks/use-onboarding";
import { DiscordServerMockup } from "./discord-server-mockup";
import {
  MessageSquare,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  Users,
  Archive,
  DollarSign,
  Rocket,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";

export function Step3Discord() {
  const operation = useOnboardingOperation();
  const location = useOnboardingLocation();
  const discord = useOnboardingDiscord();
  const { setDiscord, setCurrentStep } = useOnboardingActions();
  const router = useRouter();

  const [showManual, setShowManual] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [serverId, setServerId] = useState(discord.discord_guild_id ?? "");
  const [serverIdError, setServerIdError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

  const oauthUrl = clientId
    ? `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=117760&scope=bot&redirect_uri=${encodeURIComponent(redirectUri ?? "")}&response_type=code`
    : null;

  const validateServerId = (id: string): boolean => {
    if (!id) {
      setServerIdError("Server ID is required");
      return false;
    }
    if (!/^\d{17,20}$/.test(id)) {
      setServerIdError("Server ID must be 17-20 digits");
      return false;
    }
    setServerIdError(null);
    return true;
  };

  const handleLaunch = async (guildId?: string, skipped: boolean = false) => {
    setLaunching(true);
    setLaunchError(null);

    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farm_profile: {
            farm_name: operation.operation_name,
            country: operation.country ?? "US",
            state: operation.state,
            county: operation.county || undefined,
            business_type: operation.business_type || undefined,
            primary_crops: [],
            acres: null,
            elevators: [],
            weather_location: location.weather_location,
            weather_lat: location.weather_lat,
            weather_lng: location.weather_lng,
            timezone: location.timezone,
          },
          discord_guild_id: guildId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create workspace");
      }

      if (skipped) {
        setDiscord({ skipped: true });
      } else if (guildId) {
        setDiscord({ discord_guild_id: guildId, skipped: false });
      }

      // Redirect to dashboard with celebration param
      router.push("/dashboard?welcome=true");
    } catch (err) {
      setLaunchError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setLaunching(false);
    }
  };

  const handleManualLaunch = () => {
    if (validateServerId(serverId)) {
      handleLaunch(serverId, false);
    }
  };

  return (
    <div className="space-y-8">
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="w-5 h-5 text-[#5865F2]" />
          <h2 className="font-headline text-2xl font-bold text-[var(--text-primary)]">
            Connect Discord
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Pantheon lives in your Discord server. Connect now or set up later.
        </p>
      </m.div>

      {/* Discord mockup + benefits */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start"
      >
        <DiscordServerMockup
          operationName={operation.operation_name ?? "Your Operation"}
        />

        <div className="space-y-3">
          {[
            {
              icon: DollarSign,
              label: "Free for everyone",
              desc: "Discord is 100% free to use",
            },
            {
              icon: Archive,
              label: "Organized channels",
              desc: "Separate channels for weather, bids, and more",
            },
            {
              icon: Users,
              label: "Unlimited history",
              desc: "Full conversation history, always searchable",
            },
          ].map((b) => (
            <div
              key={b.label}
              className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]"
            >
              <b.icon className="w-4 h-4 text-[#5865F2] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {b.label}
                </p>
                <p className="text-xs text-[var(--text-dim)]">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </m.div>

      {/* Primary action: OAuth invite */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {oauthUrl ? (
          <a
            href={oauthUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-sm transition-all hover:shadow-[0_4px_20px_rgba(88,101,242,0.3)]"
          >
            Add Pantheon to Discord
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <p className="text-center text-sm text-[var(--text-dim)] py-3">
            Discord OAuth not configured. Use manual Server ID entry below.
          </p>
        )}

        {/* Manual Server ID */}
        <div>
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showManual ? "rotate-180" : ""}`}
            />
            Or paste your Server ID
          </button>

          {showManual && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 space-y-3"
            >
              <div className="flex gap-2">
                <input
                  value={serverId}
                  onChange={(e) => {
                    setServerId(e.target.value);
                    setServerIdError(null);
                  }}
                  placeholder="e.g. 1234567890123456789"
                  className="flex-1 bg-[var(--bg-card)] border border-[var(--border)] focus:border-[#5865F2] focus:ring-2 focus:ring-[rgba(88,101,242,0.2)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none transition-all font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={handleManualLaunch}
                  disabled={launching}
                  className="px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-[var(--bg-deep)] hover:shadow-[0_4px_20px_rgba(217,140,46,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {launching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Rocket className="w-4 h-4" />
                  )}
                  Launch
                </button>
              </div>
              {serverIdError && (
                <p className="text-red-400 text-xs">{serverIdError}</p>
              )}

              {/* How to find Server ID */}
              <div className="text-xs text-[var(--text-dim)] space-y-1 bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)]">
                <p className="font-medium text-[var(--text-secondary)]">
                  How to find your Server ID:
                </p>
                <ol className="list-decimal pl-4 space-y-0.5">
                  <li>Open Discord Settings &rarr; Advanced &rarr; Enable Developer Mode</li>
                  <li>Right-click your server name in the sidebar</li>
                  <li>Click &quot;Copy Server ID&quot;</li>
                </ol>
              </div>
            </m.div>
          )}
        </div>
      </m.div>

      {/* New to Discord? */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showGuide ? "rotate-180" : ""}`}
          />
          New to Discord?
        </button>

        {showGuide && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 space-y-2 bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)]"
          >
            <ol className="list-decimal pl-4 space-y-2">
              <li>
                Download Discord at{" "}
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5865F2] hover:underline"
                >
                  discord.com
                </a>
              </li>
              <li>Create a free account</li>
              <li>Create a server for your operation</li>
              <li>Come back here and click &quot;Add Pantheon to Discord&quot;</li>
            </ol>
          </m.div>
        )}
      </m.div>

      {launchError && (
        <p className="text-red-400 text-sm text-center">{launchError}</p>
      )}

      {/* Navigation */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3 pt-2"
      >
        {/* Skip option */}
        <button
          type="button"
          onClick={() => handleLaunch(undefined, true)}
          disabled={launching}
          className="w-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-light)] text-[var(--bg-deep)] font-semibold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all hover:shadow-[0_4px_20px_rgba(217,140,46,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {launching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          Launch Pantheon
        </button>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="px-6 py-3 rounded-full border border-[var(--border)] text-[var(--text-secondary)] font-medium hover:border-[var(--border-light)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => handleLaunch(undefined, true)}
            disabled={launching}
            className="text-sm text-[var(--text-dim)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
          >
            I&apos;ll set up Discord later
          </button>
        </div>
      </m.div>
    </div>
  );
}
