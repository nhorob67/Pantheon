"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Bot,
  FileText,
  Image as ImageIcon,
  File,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface SessionData {
  id: string;
  title: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface MessageData {
  id: string;
  direction: string;
  authorType: string;
  authorId: string | null;
  content: string | null;
  contentJson: Record<string, unknown>;
  createdAt: string;
}

interface InboundEmail {
  id: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  status: string;
  attachmentCount: number;
  createdAt: string;
}

interface OutboundEmail {
  id: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  bodyText: string | null;
  outboundType: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

interface AttachmentData {
  id: string;
  inboundId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface EmailThreadDetailProps {
  session: SessionData;
  messages: MessageData[];
  inboundEmails: InboundEmail[];
  outboundEmails: OutboundEmail[];
  attachments: AttachmentData[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("text"))
    return FileText;
  return File;
}

function ToolCallsSection({ contentJson }: { contentJson: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const toolCalls = contentJson.tool_calls as Array<Record<string, unknown>> | undefined;
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/60 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {toolCalls.length} tool call{toolCalls.length !== 1 ? "s" : ""} used
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {toolCalls.map((tc, i) => (
            <div key={i} className="text-xs bg-background/50 rounded px-2 py-1 font-mono text-foreground/50">
              {String(tc.name || tc.toolName || "unknown")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmailThreadDetail({
  session,
  messages,
  inboundEmails,
  outboundEmails,
  attachments,
}: EmailThreadDetailProps) {
  const attachmentsByInbound = new Map<string, AttachmentData[]>();
  for (const att of attachments) {
    const list = attachmentsByInbound.get(att.inboundId) || [];
    list.push(att);
    attachmentsByInbound.set(att.inboundId, list);
  }

  // Build a timeline mixing messages and email events
  const isProcessing = inboundEmails.some((e) => e.status === "ai_processing");

  return (
    <div>
      <Link
        href="/email"
        className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to inbox
      </Link>

      <div className="mb-6">
        <h2 className="font-headline text-xl font-bold text-foreground">
          {session.title}
        </h2>
        <p className="text-foreground/50 text-sm mt-0.5">
          {session.metadata?.from_email
            ? `From: ${String(session.metadata.from_email)}`
            : "Email thread"}
        </p>
      </div>

      <div className="space-y-4">
        {/* Inbound emails */}
        {inboundEmails.map((email) => {
          const atts = attachmentsByInbound.get(email.id) || [];
          const correspondingMessage = messages.find(
            (m) => m.direction === "inbound" && m.authorId === email.fromEmail
          );

          return (
            <div
              key={email.id}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {email.fromEmail}
                    </span>
                    <span className="text-xs text-foreground/40 shrink-0">
                      {format(new Date(email.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/50 mt-0.5">
                    {email.subject}
                  </div>

                  {correspondingMessage?.content && (
                    <div className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {correspondingMessage.content}
                    </div>
                  )}

                  {atts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {atts.map((att) => {
                        const Icon = getFileIcon(att.mimeType);
                        return (
                          <div
                            key={att.id}
                            className="inline-flex items-center gap-1.5 text-xs bg-background/50 border border-border/50 rounded-lg px-2.5 py-1.5"
                          >
                            <Icon className="w-3.5 h-3.5 text-foreground/40" />
                            <span className="text-foreground/70 truncate max-w-[160px]">
                              {att.filename}
                            </span>
                            <span className="text-foreground/30">
                              {formatBytes(att.sizeBytes)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Outbound emails (acks + responses) */}
        {outboundEmails.map((email) => {
          const isAck = email.outboundType === "acknowledgment";
          return (
            <div
              key={email.id}
              className={`bg-card border border-border rounded-xl p-5 ${
                isAck ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${
                  isAck ? "bg-foreground/5" : "bg-primary/10"
                }`}>
                  <Bot className={`w-4 h-4 ${isAck ? "text-foreground/40" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium text-sm ${
                      isAck ? "text-foreground/50" : "text-foreground"
                    }`}>
                      {isAck ? "Auto-acknowledgment" : "Pantheon Assistant"}
                    </span>
                    <span className="text-xs text-foreground/40 shrink-0">
                      {email.sentAt
                        ? format(new Date(email.sentAt), "MMM d, h:mm a")
                        : format(new Date(email.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>

                  {email.bodyText && (
                    <div className={`mt-2 text-sm whitespace-pre-wrap leading-relaxed ${
                      isAck ? "text-foreground/40 italic" : "text-foreground/80"
                    }`}>
                      {email.bodyText}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Agent response messages (with tool calls) */}
        {messages
          .filter((m) => m.direction === "outbound" && m.authorType === "agent")
          .map((msg) => {
            // Skip if we already displayed it via outboundEmails
            const alreadyShown = outboundEmails.some(
              (e) => e.outboundType === "response" && e.bodyText === msg.content
            );
            if (alreadyShown) return null;

            return (
              <div key={msg.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-foreground">
                        Pantheon Assistant
                      </span>
                      <span className="text-xs text-foreground/40 shrink-0">
                        {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {msg.content && (
                      <div className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    )}
                    <ToolCallsSection contentJson={msg.contentJson} />
                  </div>
                </div>
              </div>
            );
          })}

        {/* Processing state */}
        {isProcessing && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              </div>
              <div>
                <span className="font-medium text-sm text-foreground/60">
                  Processing...
                </span>
                <p className="text-xs text-foreground/40 mt-0.5">
                  Your AI assistant is analyzing the email and preparing a response.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
