"use client";

import { useState } from "react";
import { MessageSquare, Zap, Clock, Mail, Brain, Filter } from "lucide-react";
import Link from "next/link";

import type { ActivityFeedEvent } from "@/lib/queries/activity-feed";

type ActivityEvent = ActivityFeedEvent;

const ACTION_ICONS: Record<ActivityEvent["actionType"], typeof MessageSquare> = {
  message: MessageSquare,
  skill: Zap,
  schedule: Clock,
  email: Mail,
  memory: Brain,
};

const ACTION_LABELS: Record<ActivityEvent["actionType"], string> = {
  message: "Message",
  skill: "Skill",
  schedule: "Scheduled",
  email: "Email",
  memory: "Memory",
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface AgentActivityFeedProps {
  events: ActivityEvent[];
  agentNames?: string[];
}

export function AgentActivityFeed({ events, agentNames = [] }: AgentActivityFeedProps) {
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const filtered = events.filter((e) => {
    if (filterAgent !== "all" && e.agentName !== filterAgent) return false;
    if (filterAction !== "all" && e.actionType !== filterAction) return false;
    return true;
  });

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.12em]">Recent Activity</h3>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-foreground/40" />
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="bg-transparent text-xs text-foreground/60 border-none outline-none cursor-pointer"
          >
            <option value="all">All agents</option>
            {agentNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-transparent text-xs text-foreground/60 border-none outline-none cursor-pointer"
          >
            <option value="all">All types</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-foreground/40">
            No activity yet
          </div>
        ) : (
          filtered.slice(0, 20).map((event) => {
            const Icon = ACTION_ICONS[event.actionType];
            return (
              <div key={event.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                <div
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${event.agentColor}15`, color: event.agentColor }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{event.agentName}</span>
                    <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground/50">
                      {ACTION_LABELS[event.actionType]}
                    </span>
                    {event.channel && (
                      <span className="text-xs text-foreground/40">#{event.channel}</span>
                    )}
                    <span className="ml-auto text-xs text-foreground/30 shrink-0">{timeAgo(event.timestamp)}</span>
                  </div>
                  <p className="text-xs text-foreground/60 mt-0.5 truncate">{event.summary}</p>
                </div>
                {event.conversationId && (
                  <Link
                    href={`/conversations/${event.conversationId}`}
                    className="shrink-0 text-xs text-primary/60 hover:text-primary transition-colors mt-1"
                  >
                    View
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
