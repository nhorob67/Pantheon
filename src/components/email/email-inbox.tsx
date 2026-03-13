"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Mail, Paperclip, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface EmailConversation {
  sessionId: string;
  title: string;
  fromEmail: string;
  status: string;
  messageCount: number;
  lastPreview: string | null;
  attachmentCount: number;
  lastMessageAt: string;
  createdAt: string;
}

interface EmailInboxProps {
  conversations: EmailConversation[];
}

function StatusPill({ status }: { status: string }) {
  switch (status) {
    case "ai_responded":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
          <CheckCircle className="w-3 h-3" />
          Responded
        </span>
      );
    case "ai_processing":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </span>
      );
    case "ai_failed":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="w-3 h-3" />
          Failed
        </span>
      );
    case "processed":
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
          <Clock className="w-3 h-3" />
          Queued
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/40">
          <Clock className="w-3 h-3" />
          {status}
        </span>
      );
  }
}

export function EmailInbox({ conversations }: EmailInboxProps) {
  if (conversations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl">
        <EmptyState
          icon={Mail}
          title="Inbox is clear"
          description="Email conversations will appear here when your agents receive messages. Set up an email identity in settings to get started."
          actions={[{ label: "Configure Email Identity", variant: "secondary", href: "/settings/email" }]}
        />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
      {conversations.map((conv) => (
        <Link
          key={conv.sessionId}
          href={`/email/${conv.sessionId}`}
          className="flex items-start gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
        >
          <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
            <Mail className="w-4 h-4 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium text-sm text-foreground truncate">
                {conv.title}
              </span>
              <StatusPill status={conv.status} />
            </div>

            <div className="flex items-center gap-2 text-xs text-foreground/50">
              <span className="truncate">{conv.fromEmail}</span>
              {conv.attachmentCount > 0 && (
                <span className="inline-flex items-center gap-0.5 shrink-0">
                  <Paperclip className="w-3 h-3" />
                  {conv.attachmentCount}
                </span>
              )}
            </div>

            {conv.lastPreview && (
              <p className="text-xs text-foreground/40 mt-1 truncate">
                {conv.lastPreview}
              </p>
            )}
          </div>

          <div className="text-xs text-foreground/40 shrink-0 text-right">
            <div>{formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}</div>
            <div className="text-foreground/30 mt-0.5">
              {conv.messageCount} msg{conv.messageCount !== 1 ? "s" : ""}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
