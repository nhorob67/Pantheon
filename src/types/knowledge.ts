export interface KnowledgeFile {
  id: string;
  customer_id: string;
  instance_id: string;
  agent_id: string | null;
  file_name: string;
  file_type: KnowledgeFileType;
  file_size_bytes: number;
  storage_path: string;
  parsed_markdown: string;
  parsed_size_bytes: number;
  status: "active" | "processing" | "failed" | "archived";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** Subset for dashboard display — excludes parsed_markdown and storage_path */
export type KnowledgeFileMeta = Omit<KnowledgeFile, "parsed_markdown" | "storage_path">;

export const KNOWLEDGE_FILE_TYPES = ["pdf", "docx", "md", "txt"] as const;
export type KnowledgeFileType = (typeof KNOWLEDGE_FILE_TYPES)[number];

export const MIME_TO_FILE_TYPE: Record<string, KnowledgeFileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/markdown": "md",
  "text/plain": "txt",
};

export const MAX_RAW_FILE_SIZE = 10 * 1024 * 1024;       // 10 MB
export const MAX_PARSED_SIZE = 500 * 1024;                // 500 KB per file
export const MAX_FILES_PER_INSTANCE = 20;
export const MAX_TOTAL_PARSED_SIZE = 2 * 1024 * 1024;    // 2 MB total

/** Columns returned for dashboard display (no parsed_markdown or storage_path) */
export const KNOWLEDGE_META_COLUMNS =
  "id, customer_id, instance_id, agent_id, file_name, file_type, file_size_bytes, parsed_size_bytes, status, error_message, created_at, updated_at" as const;
