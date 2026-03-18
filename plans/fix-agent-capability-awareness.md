# Fix Agent Capability Awareness

## Problem

Agents don't know they can create files (see screenshot: agent says "I cannot actually create or generate downloadable files"). The tool documentation system (`tool-docs.ts`) was added to make agents aware of their capabilities, but a **failing test is blocking CI/deploy**, so the fix never reached production.

## Root Causes

### 1. Failing test blocks CI (`tool-docs.test.ts:50-54`)
The test "groups conversation_search under Memory" fails for two reasons:
- **Stale assertion format**: Checks for `**Memory:**` (colon) but the actual output uses `**Memory** — Save and retrieve long-term information` (em dash + summary)
- **Wrong categorization expectation**: `conversation_search` isn't in the native tool catalog and doesn't match any prefix mapping, so it lands in "Other" instead of "Memory"

### 2. Tool catalog description mismatch (`tool-catalog.ts:327-334`)
The catalog says `file_create` supports "CSV, Excel, PDF, JSON, TXT, Markdown, or HTML" but the actual tool (`file-create.ts`) only supports CSV, JSON, TXT, Markdown, HTML — no Excel or PDF.

### 3. Cron runs exclude `file_create` (`tenant-ai-worker.ts:260-288`)
The cron tool filter only allows `memory_*`, `schedule_*`, and delegation tools. `file_create` is excluded from scheduled runs.

### 4. `onFileCreated` not in `ToolRegistryInput` (`tools/registry.ts`)
The context assembler passes `onFileCreated` to `resolveToolsForAgent` but the interface doesn't declare it — a TypeScript type error that gets silently ignored at runtime.

## Plan

### Step 1: Fix the failing test (`tool-docs.test.ts`)
- Update the `conversation_search` test assertion to use the correct format (`**Memory** —` instead of `**Memory:**`)
- Add `conversation_search` to the native tool catalog so it properly categorizes under "memory", OR update the categorize function to handle the `conversation_` prefix, OR fix the test to expect the tool in "Other"
- Best approach: add a prefix fallback `conversation_` → `memory` in `categorize()` function in `tool-docs.ts`, and fix the assertion format

### Step 2: Fix tool catalog description (`tool-catalog.ts`)
- Update `file_create` description from "CSV, Excel, PDF, JSON, TXT, Markdown, or HTML" to "CSV, JSON, TXT, Markdown, or HTML" to match actual capabilities

### Step 3: Add `file_create` to cron allowed tools (`tenant-ai-worker.ts`)
- Add `"file_create"` to the set of tools allowed in cron/scheduled runs (alongside `BUILT_IN_PREFIXES` and `DELEGATION_TOOLS`)

### Step 4: Add `onFileCreated` to `ToolRegistryInput` (optional cleanup)
- Add the optional `onFileCreated` field to the `ToolRegistryInput` interface in `registry.ts` to fix the type mismatch

### Step 5: Run tests and verify
- Run the full test suite to confirm all tests pass
- Verify the tool documentation correctly includes `file_create` with accurate description

## Files to Modify

1. `src/lib/ai/tool-docs.ts` — Add `conversation_` prefix fallback in `categorize()`
2. `src/lib/ai/tool-docs.test.ts` — Fix stale assertion format
3. `src/lib/runtime/tool-catalog.ts` — Fix `file_create` description
4. `src/lib/ai/tenant-ai-worker.ts` — Add `file_create` to cron allowed tools
5. `src/lib/ai/tools/registry.ts` — Add `onFileCreated` to interface (optional)
