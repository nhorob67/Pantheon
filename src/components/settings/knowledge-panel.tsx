"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileUp,
  FileText,
  FileCode,
  FileType,
  BookOpen,
  MoreVertical,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import type { KnowledgeFileMeta } from "@/types/knowledge";
import {
  MAX_FILES_PER_INSTANCE,
  MAX_TOTAL_PARSED_SIZE,
} from "@/types/knowledge";
import { useKnowledgeManager } from "@/hooks/use-knowledge-manager";
import type { AgentOption } from "@/hooks/use-knowledge-manager";

interface KnowledgePanelProps {
  files: KnowledgeFileMeta[];
  tenantId: string;
  agents: AgentOption[];
}

const ACCEPTED_TYPES =
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain,.md,.txt,.pdf,.docx";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  switch (type) {
    case "pdf":
    case "docx":
      return <FileText className="w-5 h-5" />;
    case "md":
      return <FileCode className="w-5 h-5" />;
    default:
      return <FileType className="w-5 h-5" />;
  }
}

interface KnowledgeFileCardProps {
  file: KnowledgeFileMeta;
  agents: AgentOption[];
  agentLabel: string;
  agentAccentClass: string;
  deleting: boolean;
  reassigning: boolean;
  onDelete: (fileId: string) => void;
  onReassign: (fileId: string, agentId: string | null) => void;
}

function KnowledgeFileCard({
  file,
  agents,
  agentLabel,
  agentAccentClass,
  deleting,
  reassigning,
  onDelete,
  onReassign,
}: KnowledgeFileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`bg-card rounded-xl border border-border border-l-4 ${agentAccentClass} shadow-sm p-4 flex items-center justify-between gap-3`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-foreground/50 shrink-0">
          {fileIcon(file.file_type)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">
              {file.file_name}
            </p>
            <Badge variant="neutral">
              {file.file_type.toUpperCase()}
            </Badge>
            <span className="text-xs text-foreground/40">
              {formatBytes(file.file_size_bytes)}
            </span>
          </div>
          <p className="text-xs text-foreground/50 mt-0.5">{agentLabel}</p>
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-foreground/50 hover:text-foreground cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-10 w-48">
            <div className="px-3 py-1.5">
              <div className="flex items-center gap-2 text-xs text-foreground/50 mb-1.5">
                <ArrowRightLeft className="w-3 h-3" />
                Reassign
              </div>
              <select
                value={file.agent_id || ""}
                disabled={reassigning}
                onChange={(e) => {
                  const newAgentId = e.target.value || null;
                  onReassign(file.id, newAgentId);
                  setMenuOpen(false);
                }}
                className="w-full border border-border rounded bg-background px-2 py-1 text-xs text-foreground outline-none"
              >
                <option value="">
                  All Agents (Shared)
                </option>
                {agents.map((agent) => (
                  <option
                    key={agent.id}
                    value={agent.id}
                  >
                    {agent.display_name}
                  </option>
                ))}
              </select>
            </div>

            <hr className="border-border my-1" />

            <button
              type="button"
              disabled={deleting}
              onClick={() => onDelete(file.id)}
              className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              {deleting ? "Removing..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function KnowledgePanel({
  files: initialFiles,
  tenantId,
  agents,
}: KnowledgePanelProps) {
  const km = useKnowledgeManager({ initialFiles, tenantId, agents });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) km.uploadFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) km.uploadFile(selected);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-headline text-lg font-semibold">
          Knowledge Files
        </h3>
        <p className="text-foreground/60 text-sm">
          Upload reference documents your agents can search — crop plans,
          contracts, soil tests, equipment manuals.
        </p>
      </div>

      {/* Usage bar */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-foreground/50">
          <span>Knowledge Storage</span>
          <span>
            {formatBytes(km.totalParsedBytes)} / {formatBytes(MAX_TOTAL_PARSED_SIZE)}
          </span>
        </div>
        <Progress value={km.usagePercent} />
        <p className="text-xs text-foreground/40">
          {km.activeFiles.length} of {MAX_FILES_PER_INSTANCE} files
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !km.uploading && fileInputRef.current?.click()}
        className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors border-border hover:border-accent/50 hover:bg-accent/5 ${km.uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />
        <FileUp className="w-8 h-8 mx-auto mb-3 text-accent" />
        <p className="text-sm text-foreground/70 mb-1">
          {km.uploading
            ? "Uploading..."
            : "Drop files here or click to browse"}
        </p>
        <p className="text-xs text-foreground/40">
          PDF, DOCX, Markdown, or plain text — up to 10 MB
        </p>

        {/* Agent assignment dropdown */}
        <div
          className="mt-4"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={km.uploadAgentId}
            onChange={(e) => km.setUploadAgentId(e.target.value)}
            className="border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg bg-background px-3 py-2 outline-none transition-colors text-foreground text-sm"
          >
            <option value="">All Agents (Shared)</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* File list */}
      {km.activeFiles.length > 0 ? (
        <div className="space-y-3">
          {km.activeFiles.map((file) => (
            <KnowledgeFileCard
              key={file.id}
              file={file}
              agents={agents}
              agentLabel={km.getAgentLabel(file.agent_id)}
              agentAccentClass={km.getAgentAccent(file.agent_id)}
              deleting={km.deletingId === file.id}
              reassigning={km.reassigningId === file.id}
              onDelete={km.deleteFile}
              onReassign={km.reassignFile}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border border-dashed border-border">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-accent/40" />
          <p className="text-sm text-foreground/50 mb-1">
            No knowledge files yet
          </p>
          <p className="text-xs text-foreground/40">
            Upload documents to give your agents reference material they
            can search.
          </p>
        </div>
      )}

      {/* Failed files */}
      {km.files.filter((f) => f.status === "failed").length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground/60">
            Failed Uploads
          </h4>
          {km.files
            .filter((f) => f.status === "failed")
            .map((file) => (
              <div
                key={file.id}
                className="bg-card rounded-xl border border-red-500/20 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground/70 truncate">
                    {file.file_name}
                  </p>
                  <p className="text-xs text-red-400">
                    {file.error_message || "Parsing failed"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => km.deleteFile(file.id)}
                  loading={km.deletingId === file.id}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* Status messages */}
      {km.notice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          {km.notice}
        </div>
      )}

      {km.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {km.error}
        </div>
      )}
    </div>
  );
}
