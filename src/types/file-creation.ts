// ---------------------------------------------------------------------------
// File Creation Types
// ---------------------------------------------------------------------------

export const FILE_FORMATS = ["csv", "xlsx", "pdf", "json", "txt", "md", "html"] as const;
export type FileFormat = (typeof FILE_FORMATS)[number];

export const FORMAT_CONTENT_TYPES: Record<FileFormat, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  json: "application/json",
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
};

export const FORMAT_EXTENSIONS: Record<FileFormat, string> = {
  csv: ".csv",
  xlsx: ".xlsx",
  pdf: ".pdf",
  json: ".json",
  txt: ".txt",
  md: ".md",
  html: ".html",
};

// ---------------------------------------------------------------------------
// Content shapes (format-specific)
// ---------------------------------------------------------------------------

export interface TabularContent {
  type: "tabular";
  headers: string[];
  rows: (string | number | boolean | null)[][];
  sheetName?: string;
}

export interface DocumentContent {
  type: "document";
  title?: string;
  sections: Array<{
    heading?: string;
    body: string;
  }>;
}

export interface JsonContent {
  type: "json";
  data: unknown;
}

export type FileContent = TabularContent | DocumentContent | JsonContent;

// ---------------------------------------------------------------------------
// Tool input / output
// ---------------------------------------------------------------------------

export interface FileCreateToolInput {
  format: FileFormat;
  filename: string;
  title?: string;
  headers?: string[];
  rows?: (string | number | boolean | null)[][];
  sheet_name?: string;
  sections?: Array<{ heading?: string; body: string }>;
  data?: unknown;
}

export interface FileCreateToolOutput {
  success: boolean;
  filename: string;
  format: FileFormat;
  size_bytes: number;
  storage_key: string;
  signed_url: string;
  delivered_via: "discord_attachment" | "signed_url";
}

// ---------------------------------------------------------------------------
// Generation result (internal)
// ---------------------------------------------------------------------------

export interface FileGenerationResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// Storage record
// ---------------------------------------------------------------------------

export interface AgentFileRecord {
  id: string;
  tenant_id: string;
  customer_id: string;
  agent_id: string | null;
  file_name: string;
  file_format: FileFormat;
  content_type: string;
  size_bytes: number;
  storage_key: string;
  channel_id: string | null;
  delivered_via: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export const FILE_CREATION_LIMITS = {
  maxFileSizeBytes: 10 * 1024 * 1024,       // 10 MB output
  maxTabularRows: 50_000,
  maxTabularColumns: 200,
  maxDocumentSections: 100,
  maxFilenameLengthChars: 255,
  discordAttachmentMaxBytes: 8 * 1024 * 1024, // 8 MB default (no boost)
  signedUrlExpirySeconds: 3600,               // 1 hour
} as const;
