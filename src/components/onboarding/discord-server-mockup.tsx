"use client";

import { Hash, Volume2 } from "lucide-react";

interface DiscordServerMockupProps {
  operationName: string;
}

export function DiscordServerMockup({
  operationName,
}: DiscordServerMockupProps) {
  const serverName = operationName || "Your Operation";

  return (
    <div className="rounded-xl overflow-hidden border border-[rgba(88,101,242,0.3)] bg-[#2b2d31] shadow-lg max-w-xs mx-auto">
      {/* Server header */}
      <div className="px-4 py-3 bg-[#1e1f22] border-b border-[#1a1b1e]">
        <p className="text-sm font-semibold text-[#f2f3f5] truncate">
          {serverName}
        </p>
      </div>

      {/* Channel list */}
      <div className="p-2 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#949ba4] px-2 pt-2 pb-1">
          Text Channels
        </p>
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-[#404249]/50 text-[#f2f3f5]">
          <Hash className="w-4 h-4 text-[#80848e]" />
          <span className="text-sm">general</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[#949ba4] hover:bg-[#404249]/30 transition-colors">
          <Hash className="w-4 h-4 text-[#80848e]" />
          <span className="text-sm">weather</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[#949ba4] hover:bg-[#404249]/30 transition-colors">
          <Hash className="w-4 h-4 text-[#80848e]" />
          <span className="text-sm">grain-bids</span>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wide text-[#949ba4] px-2 pt-3 pb-1">
          Voice Channels
        </p>
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[#949ba4]">
          <Volume2 className="w-4 h-4 text-[#80848e]" />
          <span className="text-sm">General</span>
        </div>
      </div>

      {/* Bot status */}
      <div className="px-4 py-3 border-t border-[#1a1b1e] bg-[#232428]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-sm">
              🌾
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#23a55a] border-2 border-[#232428]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#f2f3f5]">Pantheon</p>
            <p className="text-[10px] text-[#23a55a]">Online</p>
          </div>
        </div>
      </div>
    </div>
  );
}
