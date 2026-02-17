"use client";

import { useCallback, useRef, useState } from "react";
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
  MAX_RAW_FILE_SIZE,
  MAX_FILES_PER_INSTANCE,
  MAX_TOTAL_PARSED_SIZE,
} from "@/types/knowledge";
import type { PersonalityPreset } from "@/types/agent";
import { PRESET_INFO } from "@/types/agent";

interface AgentOption {
  id: string;
  agent_key: string;
  display_name: string;
  personality_preset: PersonalityPreset;
}

interface KnowledgePanelProps {
  files: KnowledgeFileMeta[];
  instanceId: string;
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

export function KnowledgePanel({
  files: initialFiles,
  instanceId,
  agents,
}: KnowledgePanelProps) {
  const [files, setFiles] = useState<KnowledgeFileMeta[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [uploadAgentId, setUploadAgentId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFiles = files.filter((f) => f.status === "active");
  const totalParsedBytes = activeFiles.reduce(
    (sum, f) => sum + f.parsed_size_bytes,
    0
  );
  const usagePercent = Math.round(
    (totalParsedBytes / MAX_TOTAL_PARSED_SIZE) * 100
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      setNotice(null);

      if (file.size > MAX_RAW_FILE_SIZE) {
        setError("File exceeds 10 MB size limit.");
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      if (uploadAgentId) {
        formData.append("agent_id", uploadAgentId);
      }

      try {
        const res = await fetch(
          `/api/instances/${instanceId}/knowledge`,
          { method: "POST", body: formData }
        );
        const payload = (await res.json()) as {
          file?: KnowledgeFileMeta;
          error?: string;
        };

        if (!res.ok || !payload.file) {
          throw new Error(payload.error || "Upload failed");
        }

        setFiles((prev) => [payload.file!, ...prev]);
        setNotice(`${file.name} uploaded successfully.`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed"
        );
      } finally {
        setUploading(false);
      }
    },
    [instanceId, uploadAgentId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) uploadFile(droppedFile);
    },
    [uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) uploadFile(selected);
      // Reset so the same file can be selected again
      e.target.value = "";
    },
    [uploadFile]
  );

  const deleteFile = async (fileId: string) => {
    setDeletingId(fileId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(
        `/api/instances/${instanceId}/knowledge/${fileId}`,
        { method: "DELETE" }
      );
      const payload = (await res.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !payload.success) {
        throw new Error(payload.error || "Delete failed");
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setNotice("File removed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Delete failed"
      );
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
    }
  };

  const reassignFile = async (
    fileId: string,
    agentId: string | null
  ) => {
    setReassigningId(fileId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(
        `/api/instances/${instanceId}/knowledge/${fileId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: agentId }),
        }
      );
      const payload = (await res.json()) as {
        file?: KnowledgeFileMeta;
        error?: string;
      };

      if (!res.ok || !payload.file) {
        throw new Error(payload.error || "Reassignment failed");
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? payload.file! : f))
      );
      setNotice("File reassigned.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Reassignment failed"
      );
    } finally {
      setReassigningId(null);
    }
  };

  const getAgentLabel = (agentId: string | null) => {
    if (!agentId) return "Shared · All agents";
    const agent = agents.find((a) => a.id === agentId);
    return agent ? agent.display_name : "Unknown agent";
  };

  const getAgentAccent = (agentId: string | null) => {
    if (!agentId) return "border-l-accent";
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return "border-l-border";
    const presetInfo = PRESET_INFO[agent.personality_preset];
    // Map text color to border color
    return presetInfo?.accent?.replace("text-", "border-l-") || "border-l-accent";
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
            {formatBytes(totalParsedBytes)} / {formatBytes(MAX_TOTAL_PARSED_SIZE)}
          </span>
        </div>
        <Progress value={usagePercent} />
        <p className="text-xs text-foreground/40">
          {activeFiles.length} of {MAX_FILES_PER_INSTANCE} files
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-border hover:border-accent/50 hover:bg-accent/5"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />
        <FileUp
          className={`w-8 h-8 mx-auto mb-3 text-accent ${
            dragOver ? "animate-pulse" : ""
          }`}
        />
        <p className="text-sm text-foreground/70 mb-1">
          {uploading
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
            value={uploadAgentId}
            onChange={(e) => setUploadAgentId(e.target.value)}
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
      {activeFiles.length > 0 ? (
        <div className="space-y-3">
          {activeFiles.map((file) => (
            <div
              key={file.id}
              className={`bg-card rounded-xl border border-border border-l-4 ${getAgentAccent(
                file.agent_id
              )} shadow-sm p-4 flex items-center justify-between gap-3`}
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
                  <p className="text-xs text-foreground/50 mt-0.5">
                    {getAgentLabel(file.agent_id)}
                  </p>
                </div>
              </div>

              {/* Actions menu */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setMenuOpenId(
                      menuOpenId === file.id ? null : file.id
                    )
                  }
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-foreground/50 hover:text-foreground cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpenId === file.id && (
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 z-10 w-48">
                    {/* Reassign option */}
                    <div className="px-3 py-1.5">
                      <div className="flex items-center gap-2 text-xs text-foreground/50 mb-1.5">
                        <ArrowRightLeft className="w-3 h-3" />
                        Reassign
                      </div>
                      <select
                        value={file.agent_id || ""}
                        disabled={reassigningId === file.id}
                        onChange={(e) => {
                          const newAgentId =
                            e.target.value || null;
                          reassignFile(file.id, newAgentId);
                          setMenuOpenId(null);
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

                    {/* Delete */}
                    <button
                      type="button"
                      disabled={deletingId === file.id}
                      onClick={() => deleteFile(file.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      {deletingId === file.id
                        ? "Removing..."
                        : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            </div>
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
      {files.filter((f) => f.status === "failed").length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground/60">
            Failed Uploads
          </h4>
          {files
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
                  onClick={() => deleteFile(file.id)}
                  loading={deletingId === file.id}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
        </div>
      )}

      {/* Status messages */}
      {notice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
