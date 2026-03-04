"use client";

import { useCallback, useState } from "react";
import type { KnowledgeFileMeta } from "@/types/knowledge";
import {
  MAX_RAW_FILE_SIZE,
  MAX_TOTAL_PARSED_SIZE,
} from "@/types/knowledge";
import type { PersonalityPreset } from "@/types/agent";
import { PRESET_INFO } from "@/types/agent";

export interface AgentOption {
  id: string;
  agent_key: string;
  display_name: string;
  personality_preset: PersonalityPreset;
}

export function useKnowledgeManager(opts: {
  initialFiles: KnowledgeFileMeta[];
  tenantId: string;
  agents: AgentOption[];
}) {
  const { tenantId, agents } = opts;
  const [files, setFiles] = useState<KnowledgeFileMeta[]>(opts.initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [uploadAgentId, setUploadAgentId] = useState<string>("");

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
          `/api/tenants/${tenantId}/knowledge`,
          { method: "POST", body: formData }
        );
        const payload = (await res.json()) as {
          data?: { file?: KnowledgeFileMeta };
          file?: KnowledgeFileMeta;
          error?: string | { message?: string };
        };
        const nextFile = payload?.data?.file || payload?.file;
        const errorMessage =
          typeof payload?.error === "string"
            ? payload.error
            : payload?.error?.message;

        if (!res.ok || !nextFile) {
          throw new Error(errorMessage || "Upload failed");
        }

        setFiles((prev) => [nextFile, ...prev]);
        setNotice(`${file.name} uploaded successfully.`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed"
        );
      } finally {
        setUploading(false);
      }
    },
    [tenantId, uploadAgentId]
  );

  const deleteFile = async (fileId: string) => {
    setDeletingId(fileId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/knowledge/${fileId}`,
        { method: "DELETE" }
      );
      const payload = (await res.json()) as {
        data?: { success?: boolean };
        success?: boolean;
        error?: string | { message?: string };
      };
      const success = payload?.data?.success ?? payload?.success;
      const errorMessage =
        typeof payload?.error === "string"
          ? payload.error
          : payload?.error?.message;

      if (!res.ok || !success) {
        throw new Error(errorMessage || "Delete failed");
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setNotice("File removed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Delete failed"
      );
    } finally {
      setDeletingId(null);
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
        `/api/tenants/${tenantId}/knowledge/${fileId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: agentId }),
        }
      );
      const payload = (await res.json()) as {
        data?: { file?: KnowledgeFileMeta };
        file?: KnowledgeFileMeta;
        error?: string | { message?: string };
      };
      const nextFile = payload?.data?.file || payload?.file;
      const errorMessage =
        typeof payload?.error === "string"
          ? payload.error
          : payload?.error?.message;

      if (!res.ok || !nextFile) {
        throw new Error(errorMessage || "Reassignment failed");
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? nextFile : f))
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
    return presetInfo?.accent?.replace("text-", "border-l-") || "border-l-accent";
  };

  return {
    files,
    activeFiles,
    totalParsedBytes,
    usagePercent,
    uploading,
    uploadAgentId,
    setUploadAgentId,
    uploadFile,
    deletingId,
    deleteFile,
    reassigningId,
    reassignFile,
    error,
    notice,
    getAgentLabel,
    getAgentAccent,
  };
}
