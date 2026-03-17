# File Creation Capabilities — Implementation Plan

## Problem

The soul template (`src/lib/templates/soul.ts`) claims agents can create Excel, CSV, PDF, Word, charts, and ZIP files — but **none of the infrastructure exists**:

- No `file_create` tool in the 34-tool native catalog
- No file generation libraries in `package.json`
- Discord responses are text-only (no attachment support)
- No Supabase Storage bucket for agent-generated files

The existing patterns (browser-artifacts, knowledge files) prove the storage layer works — we just need to extend it.

---

## Architecture Overview

```
Agent calls file_create tool
        │
        ▼
┌─────────────────────┐
│  File Generator      │  ← New: src/lib/file-generation/
│  (CSV, XLSX, PDF,   │
│   JSON, TXT, MD,    │
│   HTML)             │
└────────┬────────────┘
         │ Buffer
         ▼
┌─────────────────────┐
│  Supabase Storage    │  ← Bucket: "agent-files"
│  agent-files/        │
│  {tenant}/{agent}/   │
│  {timestamp}_{name}  │
└────────┬────────────┘
         │ Signed URL
         ▼
┌─────────────────────┐
│  Discord Attachment  │  ← New: multipart/form-data upload
│  (files ≤ 25MB)     │
│  OR signed URL link  │
│  (files > 25MB)     │
└─────────────────────┘
```

---

## Phase 1: File Generation Library

### New dependencies

```bash
npm install exceljs pdfkit
```

| Format | Library | Serverless-safe | Notes |
|--------|---------|----------------|-------|
| CSV | Built-in | Yes | String concatenation with proper escaping |
| Excel (.xlsx) | `exceljs` | Yes | Pure JS, streaming support |
| PDF | `pdfkit` | Yes | Pure JS, no native deps |
| JSON | Built-in | Yes | `JSON.stringify` with formatting |
| TXT / Markdown | Built-in | Yes | Plain text |
| HTML | Built-in | Yes | Template string rendering |

### New files

**`src/lib/file-generation/index.ts`** — Main entry point / dispatcher

```ts
export type FileFormat = "csv" | "xlsx" | "pdf" | "json" | "txt" | "md" | "html";

export interface FileGenerationRequest {
  format: FileFormat;
  filename: string;
  content: FileContent;
}

export interface FileGenerationResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  sizeBytes: number;
}

// Content is format-specific
export type FileContent =
  | TabularContent    // csv, xlsx
  | DocumentContent   // pdf, txt, md, html
  | JsonContent;      // json
```

**`src/lib/file-generation/csv-generator.ts`** — CSV with proper RFC 4180 escaping

**`src/lib/file-generation/xlsx-generator.ts`** — Excel via exceljs (headers, sheets, basic formatting)

**`src/lib/file-generation/pdf-generator.ts`** — PDF via pdfkit (title, sections, tables, text)

**`src/lib/file-generation/json-generator.ts`** — Pretty-printed JSON output

**`src/lib/file-generation/text-generator.ts`** — TXT and Markdown passthrough

**`src/lib/file-generation/html-generator.ts`** — HTML with basic document template

### Content schemas

```ts
// For CSV and XLSX
interface TabularContent {
  type: "tabular";
  headers: string[];
  rows: (string | number | boolean | null)[][];
  sheetName?: string;  // xlsx only
}

// For PDF, TXT, MD, HTML
interface DocumentContent {
  type: "document";
  title?: string;
  sections: Array<{
    heading?: string;
    body: string;
  }>;
}

// For JSON
interface JsonContent {
  type: "json";
  data: unknown;
}
```

### Guardrails

- Max file size: 10 MB (aligns with knowledge file limit)
- Max rows for tabular: 50,000
- Max sections for documents: 100
- Filename sanitization: strip path traversal, limit to 255 chars, alphanumeric + `-_.`

---

## Phase 2: Tool Registration

### Add to tool catalog

**`src/lib/runtime/tool-catalog.ts`** — Add new `file_create` tool entry:

```ts
// ── File Creation ─────────────────────────────────────────────────────
native(
  "file_create",
  "Create File",
  "Generate a file (CSV, Excel, PDF, JSON, TXT, Markdown, HTML) and send it as a Discord attachment",
  "file-creation",
  "medium",
  { writesState: true }
),
```

### Add category to contracts

**`src/lib/runtime/tool-contracts.ts`** — Add `"file-creation"` to `ToolCategory` union.

### Add types

**`src/types/file-creation.ts`** — TypeScript interfaces for file creation tool input/output:

```ts
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
  format: string;
  size_bytes: number;
  storage_key: string;
  signed_url: string;
  delivered_via: "discord_attachment" | "signed_url";
}
```

### Zod validator

**`src/lib/validators/file-creation.ts`** — Zod schema for `FileCreateToolInput` with format-specific validation (e.g., tabular formats require `headers` + `rows`, document formats require `sections` or `data`).

---

## Phase 3: Supabase Storage Integration

### New file

**`src/lib/file-generation/file-storage.ts`** — Modeled after `browser-artifacts.ts`:

```ts
const BUCKET_NAME = "agent-files";

export async function storeAgentFile(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    customerId: string;
    agentId: string | null;
    filename: string;
    data: Buffer;
    contentType: string;
  }
): Promise<{ storageKey: string; signedUrl: string }>;

export async function getAgentFileUrl(
  admin: SupabaseClient,
  storageKey: string,
  expiresIn?: number
): Promise<string | null>;

export async function listAgentFiles(
  admin: SupabaseClient,
  tenantId: string,
  limit?: number
): Promise<AgentFileRecord[]>;
```

### Database migration

**`supabase/migrations/NNNN_agent_generated_files.sql`**:

```sql
-- Track agent-generated files
CREATE TABLE IF NOT EXISTS tenant_agent_files (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenant_instances(id) ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  agent_id     uuid REFERENCES tenant_agents(id) ON DELETE SET NULL,
  file_name    text NOT NULL,
  file_format  text NOT NULL,  -- csv, xlsx, pdf, json, txt, md, html
  content_type text NOT NULL,
  size_bytes   integer NOT NULL,
  storage_key  text NOT NULL,
  channel_id   text,           -- Discord channel where file was delivered
  delivered_via text NOT NULL DEFAULT 'discord_attachment',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS: customers can see their own files
ALTER TABLE tenant_agent_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers see own files"
  ON tenant_agent_files FOR SELECT
  USING (customer_id = auth.uid());

-- Index for listing files by tenant
CREATE INDEX idx_agent_files_tenant ON tenant_agent_files(tenant_id, created_at DESC);

-- Auto-cleanup: files older than 30 days (optional, via cron or Trigger.dev)
```

### Storage bucket setup

The `agent-files` bucket needs to be created in Supabase Storage (via dashboard or migration). File size limit: 25 MB (Discord's max). Retention policy: 30 days (configurable).

---

## Phase 4: Tool Executor Implementation

### Modify unified tool executor

**`src/lib/runtime/unified-tool-executor.ts`** — Add `file_create` to the native tool execution switch:

1. Validate input with Zod schema
2. Dispatch to appropriate generator (CSV, XLSX, PDF, etc.)
3. Upload to Supabase Storage via `storeAgentFile()`
4. Return `FileCreateToolOutput` with storage key and signed URL
5. **Set a flag** on the tool result indicating a file attachment is pending

### Wire into AI worker response

**`src/lib/ai/tenant-ai-worker.ts`** — After `generateText()` completes, check if any tool calls produced file attachments. If so, download the file from storage and send via Discord's attachment API instead of (or in addition to) the text response.

---

## Phase 5: Discord Attachment Support

### Modify Discord message sender

**`src/lib/runtime/tenant-runtime-discord.ts`** — Add new function:

```ts
export interface DiscordFileAttachment {
  filename: string;
  data: Buffer;
  contentType: string;
  description?: string;
}

export async function sendDiscordChannelMessageWithAttachments(
  input: DiscordSendMessageInput & {
    attachments: DiscordFileAttachment[];
  },
  fetchImpl?: typeof fetch
): Promise<DiscordSendMessageResult>;
```

Implementation uses `multipart/form-data`:
- `payload_json` part: message content + attachments metadata
- `files[N]` parts: binary file data

Discord limits:
- 25 MB per file (8 MB without Nitro boost on the server)
- 10 attachments per message

### Fallback strategy

If the file exceeds Discord's attachment limit or upload fails:
- Send a text message with the signed URL instead
- URL expires in 1 hour (configurable)

---

## Phase 6: Soul Template Update

### Replace aspirational instructions with real tool usage

**`src/lib/templates/soul.ts`** — Replace the `## File Creation Capabilities` section:

```markdown
## File Creation Capabilities

You can create files and deliver them directly to users as Discord attachments
using the `file_create` tool.

**Supported formats:**
- **CSV** — Tabular data. Provide `headers` and `rows`.
- **Excel (.xlsx)** — Spreadsheets with formatting. Provide `headers`, `rows`, and optional `sheet_name`.
- **PDF** — Documents with title and sections. Provide `title` and `sections` array.
- **JSON** — Structured data. Provide `data` (any shape).
- **TXT / Markdown** — Plain text or formatted text. Provide `sections` with body text.
- **HTML** — Web-ready documents. Provide `sections` with body content.

**Usage:** Call `file_create` with the desired `format`, `filename`, and content fields.
The file is automatically sent as a Discord attachment in your response.

**Limits:** Max 10 MB per file. Max 50,000 rows for tabular formats.
```

---

## Phase 7: Tests

### Unit tests

**`src/lib/file-generation/__tests__/csv-generator.test.ts`**
- Generates valid CSV with proper escaping (commas, quotes, newlines in values)
- Handles empty rows, single column, unicode

**`src/lib/file-generation/__tests__/xlsx-generator.test.ts`**
- Generates valid .xlsx buffer (verify with exceljs read-back)
- Custom sheet name, header styling

**`src/lib/file-generation/__tests__/pdf-generator.test.ts`**
- Generates valid PDF buffer (verify magic bytes `%PDF`)
- Title, sections, empty document

**`src/lib/file-generation/__tests__/json-generator.test.ts`**
- Pretty-prints JSON, handles nested objects, arrays

**`src/lib/file-generation/__tests__/text-generator.test.ts`**
- TXT and MD passthrough with sections

**`src/lib/file-generation/__tests__/html-generator.test.ts`**
- Valid HTML document structure

**`src/lib/file-generation/__tests__/file-storage.test.ts`**
- Storage key format, signed URL generation (mocked Supabase)

**`src/lib/file-generation/__tests__/guardrails.test.ts`**
- File size limits enforced
- Row count limits enforced
- Filename sanitization (path traversal blocked)

### Integration tests

**`src/lib/runtime/file-create-tool.test.ts`**
- Tool registered in catalog
- Tool execution produces correct output shape
- Policy enforcement (approval modes)

**`src/lib/runtime/tenant-runtime-discord-attachments.test.ts`**
- Multipart form data construction
- Fallback to signed URL on oversized files
- Content type mapping

---

## Phase 8: Documentation

**`content/docs/tools/file-creation.mdx`** — User-facing docs:
- Supported formats and use cases
- Examples for each format
- Size limits and constraints
- How delivery works (Discord attachment vs. signed URL)

---

## File Change Summary

### New files (14)
| File | Purpose |
|------|---------|
| `src/lib/file-generation/index.ts` | Entry point, dispatcher, types |
| `src/lib/file-generation/csv-generator.ts` | CSV generation |
| `src/lib/file-generation/xlsx-generator.ts` | Excel generation |
| `src/lib/file-generation/pdf-generator.ts` | PDF generation |
| `src/lib/file-generation/json-generator.ts` | JSON generation |
| `src/lib/file-generation/text-generator.ts` | TXT/MD generation |
| `src/lib/file-generation/html-generator.ts` | HTML generation |
| `src/lib/file-generation/file-storage.ts` | Supabase Storage integration |
| `src/types/file-creation.ts` | TypeScript types |
| `src/lib/validators/file-creation.ts` | Zod validation schemas |
| `src/lib/file-generation/__tests__/*.test.ts` | Unit tests (8 files) |
| `supabase/migrations/NNNN_agent_generated_files.sql` | Database migration |
| `content/docs/tools/file-creation.mdx` | User documentation |

### Modified files (5)
| File | Change |
|------|--------|
| `package.json` | Add `exceljs`, `pdfkit` dependencies |
| `src/lib/runtime/tool-catalog.ts` | Add `file_create` tool entry |
| `src/lib/runtime/tool-contracts.ts` | Add `"file-creation"` category |
| `src/lib/runtime/unified-tool-executor.ts` | Add file_create execution logic |
| `src/lib/runtime/tenant-runtime-discord.ts` | Add attachment sending function |
| `src/lib/ai/tenant-ai-worker.ts` | Wire file attachments into response flow |
| `src/lib/templates/soul.ts` | Replace aspirational instructions with real tool docs |

---

## Implementation Order

1. **Phase 1** — File generation library (independent, testable in isolation)
2. **Phase 2** — Tool registration (catalog + contracts + types + validator)
3. **Phase 3** — Storage integration (Supabase bucket + migration + storage helper)
4. **Phase 4** — Tool executor (wire generator + storage into unified executor)
5. **Phase 5** — Discord attachments (multipart upload + fallback)
6. **Phase 6** — Soul template update (swap aspirational → real instructions)
7. **Phase 7** — Tests (unit + integration)
8. **Phase 8** — Documentation (MDX page)

Phases 1-2 can be done in parallel. Phase 3 depends on nothing. Phases 4-5 depend on 1-3. Phase 6 depends on 2. Phase 7 runs throughout.

---

## Risk & Considerations

- **Serverless cold starts**: `exceljs` and `pdfkit` add ~2-3 MB to the bundle. Acceptable for Vercel serverless functions.
- **Memory usage**: Large Excel/PDF generation could spike memory. The 10 MB output limit + 50K row limit keeps this bounded.
- **Discord file size**: Server boost level affects max upload (8 MB base, 25 MB level 2, 50 MB level 3). Default to 8 MB with fallback to signed URL.
- **Storage costs**: 30-day retention policy keeps Supabase Storage costs predictable.
- **Existing tenants**: The `ensureNativeToolCatalog()` function already handles seeding new tools into existing tenants on next tool resolution — no separate backfill needed.
