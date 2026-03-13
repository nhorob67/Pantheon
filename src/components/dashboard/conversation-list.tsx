"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface SessionSummary {
  id: string;
  session_kind: string;
  status: string;
  rolling_summary: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string | null;
  last_message_direction: string | null;
}

interface ConversationListProps {
  sessions: SessionSummary[];
  tenantId: string;
}

export function ConversationList({ sessions }: ConversationListProps) {
  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Conversations appear here once users start chatting with your agents in Discord."
          actions={[{ label: "Set Up Discord", variant: "secondary", href: "/settings/discord" }]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Link
          key={session.id}
          href={`/conversations/${session.id}`}
          className="block bg-card rounded-xl border border-border shadow-sm p-4 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium uppercase tracking-wider text-foreground/40">
                  {session.session_kind}
                </span>
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    session.status === "active"
                      ? "bg-green-500"
                      : session.status === "idle"
                        ? "bg-yellow-500"
                        : "bg-foreground/20"
                  }`}
                />
              </div>
              {session.last_message_preview && (
                <p className="text-sm text-foreground/80 truncate">
                  {session.last_message_preview}
                </p>
              )}
              {!session.last_message_preview && session.rolling_summary && (
                <p className="text-sm text-foreground/60 truncate">
                  {session.rolling_summary.slice(0, 120)}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-foreground/60">
                {formatDistanceToNow(new Date(session.updated_at), {
                  addSuffix: true,
                })}
              </p>
              <p className="text-xs text-foreground/40 mt-1">
                {session.message_count} messages
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
