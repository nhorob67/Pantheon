"use client";

import { FileText, Upload } from "lucide-react";
import Link from "next/link";

interface KnowledgeFile {
  id: string;
  file_name: string;
  file_type: string;
  agent_id: string | null;
}

interface InspectorKnowledgeSectionProps {
  agentId: string;
  knowledgeFiles: KnowledgeFile[];
}

export function InspectorKnowledgeSection({
  agentId,
  knowledgeFiles,
}: InspectorKnowledgeSectionProps) {
  const agentFiles = knowledgeFiles.filter(
    (file) => file.agent_id === null || file.agent_id === agentId
  );

  return (
    <div className="space-y-3">
      {agentFiles.length > 0 ? (
        <div className="space-y-1.5">
          {agentFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-2 text-sm">
              <FileText className="w-3.5 h-3.5 text-text-dim shrink-0" />
              <span className="text-text-secondary truncate">{file.file_name}</span>
              <span className="text-[10px] text-text-dim">
                {file.agent_id ? "Agent" : "Shared"}
              </span>
              <span className="text-[10px] text-text-dim ml-auto uppercase">{file.file_type}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-dim">No knowledge files attached.</p>
      )}

      <Link
        href="/settings/knowledge"
        className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-light transition-colors"
      >
        <Upload className="w-3 h-3" />
        Manage knowledge files
      </Link>
    </div>
  );
}
