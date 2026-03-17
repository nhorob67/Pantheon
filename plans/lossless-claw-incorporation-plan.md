# Implementation Plan: Incorporating Lossless Claw Principles

## Overview

Three features, implemented in order of increasing complexity. Each is independently shippable.

---

## Phase 1: Adaptive Compaction Threshold

**Goal**: Replace the fixed 6,000-token compaction trigger with a percentage of the model's context window.

### Step 1.1 — Add context window sizes to model catalog

**File**: `supabase/migrations/00096_model_catalog_context_window.sql`

```sql
ALTER TABLE model_catalog
  ADD COLUMN IF NOT EXISTS context_window_tokens INTEGER;

-- Seed known models
UPDATE model_catalog SET context_window_tokens = 200000
  WHERE id LIKE 'claude-sonnet-4%' OR id LIKE 'claude-opus-4%';
UPDATE model_catalog SET context_window_tokens = 200000
  WHERE id LIKE 'claude-haiku-4%';
```

### Step 1.2 — Expose context window in ResolvedModel

**File**: `src/lib/ai/model-resolver.ts`

- Add `contextWindowTokens: number` to the `ResolvedModel` interface
- Read `context_window_tokens` from the `model_catalog` query (already fetched in `resolveModels`)
- Default to 200,000 if null (safe default for Claude models)
- Add to `SYSTEM_DEFAULTS` objects: `context_window_tokens: 200_000`

### Step 1.3 — Make session-summarizer threshold adaptive

**File**: `src/lib/ai/session-summarizer.ts`

- Add a new `contextWindowTokens` parameter to `SummarizeInput`
- Replace the constant:
  ```typescript
  // Before:
  const TOKEN_COMPACTION_THRESHOLD = 6000;

  // After:
  const COMPACTION_RATIO = 0.08; // 8% of context window
  const MIN_COMPACTION_THRESHOLD = 4000;
  const MAX_COMPACTION_THRESHOLD = 30000;
  ```
- Compute threshold: `Math.max(MIN_COMPACTION_THRESHOLD, Math.min(MAX_COMPACTION_THRESHOLD, Math.floor(contextWindowTokens * COMPACTION_RATIO)))`
- Rationale for 8%: conversation history occupies ~50% of assembled context (system prompt, memory, knowledge, tools take the other 50%). The history loader caps at 8,000 tokens by default. Triggering compaction at 8% of a 200K window = 16K, which means larger models accumulate more raw history before summarizing. For the default 200K models this roughly triples the current threshold, reducing unnecessary compaction. The min/max bounds prevent pathological behavior on tiny or enormous windows.

### Step 1.4 — Wire context window through the call chain

**File**: `src/lib/ai/tenant-ai-worker.ts`

- Pass `contextWindowTokens` from `resolvedModels.primary.contextWindowTokens` into `maybeGenerateSummary`
- The summarizer already receives a `model` parameter; add `contextWindowTokens` alongside it

### Step 1.5 — Update tests

**File**: `src/lib/ai/session-summarizer.test.ts` (if exists) or inline in existing test files

- Test that threshold scales with context window
- Test min/max clamping
- Test default behavior when contextWindowTokens is undefined

---

## Phase 2: Conversation Search Tool

**Goal**: Let agents search the raw conversation transcript, not just extracted memory records.

### Step 2.1 — Add text search index on tenant_messages

**File**: `supabase/migrations/00096_conversation_search.sql` (or combined with Phase 1 migration)

```sql
-- GIN index for full-text search on message content
ALTER TABLE tenant_messages
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content_text, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_tenant_messages_tsv
  ON tenant_messages USING gin(content_tsv);

-- RPC for ranked conversation search
CREATE OR REPLACE FUNCTION search_tenant_messages(
  p_tenant_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  session_id UUID,
  direction TEXT,
  content_text TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql STABLE
AS $$
  SELECT
    tm.id,
    tm.session_id,
    tm.direction,
    tm.content_text,
    tm.created_at,
    ts_rank_cd(tm.content_tsv, websearch_to_tsquery('english', p_query)) AS rank
  FROM tenant_messages tm
  JOIN tenant_sessions ts ON ts.id = tm.session_id
  WHERE ts.tenant_id = p_tenant_id
    AND tm.content_tsv @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC, tm.created_at DESC
  LIMIT p_limit;
$$;
```

### Step 2.2 — Create conversation search module

**File**: `src/lib/ai/conversation-search.ts` (new)

```typescript
export async function searchConversations(
  admin: SupabaseClient,
  tenantId: string,
  query: string,
  limit: number = 10
): Promise<ConversationSearchResult[]>
```

- Call the `search_tenant_messages` RPC
- Format results with session context (date, direction, snippet)
- Truncate long content_text to 500 chars for tool display

### Step 2.3 — Add conversation_search tool

**File**: `src/lib/ai/tools/memory.ts`

Add a new `conversation_search` tool to the `createMemoryTools` return object:

```typescript
conversation_search: tool({
  description: "Search past conversation messages for specific topics, decisions, or discussions. Use this when the user asks about previous conversations or when memory_search doesn't have the answer.",
  inputSchema: z.object({
    query: z.string().describe("What to search for in conversation history"),
    limit: z.number().optional().describe("Max results (default 10)"),
  }),
  execute: async ({ query, limit }) => { ... }
})
```

### Step 2.4 — Register in tool docs

**File**: `src/lib/ai/tool-docs.ts`

Add documentation entry for `conversation_search` so the system prompt describes when to use it vs `memory_search`.

### Step 2.5 — Tests

**File**: `src/lib/ai/tools/conversation-search.test.ts` (new)

- Test search returns results
- Test empty query handling
- Test result formatting and truncation
- Test tenant isolation (results only from correct tenant)

---

## Phase 3: Hierarchical Summary DAG

**Goal**: Replace the flat `rolling_summary` with a tree of summary nodes that preserves proportional detail at every depth.

### Step 3.1 — Database migration

**File**: `supabase/migrations/00097_session_summary_dag.sql`

```sql
CREATE TABLE session_summary_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES tenant_sessions(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES session_summary_nodes(id) ON DELETE SET NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  summary_text TEXT NOT NULL,
  source_message_ids UUID[] NOT NULL DEFAULT '{}',
  source_node_ids UUID[] NOT NULL DEFAULT '{}',
  token_count INTEGER NOT NULL DEFAULT 0,
  message_time_start TIMESTAMPTZ,
  message_time_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient DAG traversal
CREATE INDEX idx_ssn_session_depth
  ON session_summary_nodes(session_id, depth, created_at DESC);

CREATE INDEX idx_ssn_parent
  ON session_summary_nodes(parent_node_id)
  WHERE parent_node_id IS NOT NULL;

-- RLS: inherit from tenant_sessions
ALTER TABLE session_summary_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session summary nodes"
  ON session_summary_nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_sessions ts
      WHERE ts.id = session_summary_nodes.session_id
        AND is_tenant_member(ts.tenant_id)
    )
  );
```

Keep the existing `rolling_summary` column on `tenant_sessions` for backward compatibility during rollout. It becomes a denormalized cache of the root summary.

### Step 3.2 — Summary node writer

**File**: `src/lib/ai/summary-dag.ts` (new)

Core functions:

```typescript
// Insert a leaf summary node (depth 0) from raw messages
export async function createLeafSummary(
  admin: SupabaseClient,
  sessionId: string,
  messageIds: string[],
  summaryText: string,
  timeRange: { start: string; end: string }
): Promise<{ id: string; depth: number }>

// Condense multiple same-depth nodes into a parent node
export async function condenseSummaryNodes(
  admin: SupabaseClient,
  sessionId: string,
  childNodeIds: string[],
  summaryText: string
): Promise<{ id: string; depth: number }>

// Load the summary DAG for context assembly
export async function loadSummaryDAG(
  admin: SupabaseClient,
  sessionId: string,
  options?: { maxDepth?: number; tokenBudget?: number }
): Promise<SummaryNode[]>

// Walk the DAG to build context: root summary + recent leaf summaries
export async function assembleSummaryContext(
  admin: SupabaseClient,
  sessionId: string,
  tokenBudget: number
): Promise<{ text: string; tokenCount: number; nodeIds: string[] }>
```

### Step 3.3 — Rewrite session-summarizer for DAG production

**File**: `src/lib/ai/session-summarizer.ts`

Replace the current `maybeGenerateSummary`:

1. **Leaf pass**: When triggered, summarize the unsummarized message batch into a leaf node (depth 0) instead of overwriting `rolling_summary`. Store via `createLeafSummary`.

2. **Condensation pass**: After creating a leaf, check if there are >= 4 uncondensed leaf nodes for this session. If so, summarize them into a depth-1 node via `condenseSummaryNodes`. Recurse: if >= 4 depth-1 nodes exist, create depth-2, etc. Cap at depth 3 (plenty for even very long conversations).

3. **Rolling summary cache**: After DAG update, regenerate `rolling_summary` by reading the root node's text. This preserves backward compatibility — context-assembler can use either the DAG or the flat summary.

4. **Escalation strategy** (inspired by Lossless Claw):
   - Normal: standard LLM summary targeting ~300 tokens per leaf, ~500 tokens per condensed node
   - Aggressive: if normal returns empty/too-short, retry with lower temperature (0.1) and 60% token target
   - Deterministic fallback: if LLM fails entirely, truncate messages to first/last 2 sentences each + metadata

5. **Pre-compaction flush** stays unchanged — runs before the leaf pass.

### Step 3.4 — Update context-assembler to use DAG

**File**: `src/lib/ai/context-assembler.ts`

Replace the flat `rolling_summary` injection:

```typescript
// Before:
if (session.rolling_summary) {
  systemPrompt += `\n\n## Previous conversation context\n...${session.rolling_summary}...`;
}

// After:
const summaryContext = await assembleSummaryContext(admin, session.id, SUMMARY_TOKEN_BUDGET);
if (summaryContext.text) {
  systemPrompt += `\n\n## Previous conversation context\n...${summaryContext.text}...`;
}
```

The `assembleSummaryContext` function builds a multi-level view:
- Highest-depth node (broadest summary) first
- Then the 2-3 most recent leaf nodes (recent detail)
- Fit within a configurable token budget (default ~2000 tokens, up from current flat summary)

Fallback: if no DAG nodes exist (new session or pre-migration), use `rolling_summary` as before.

### Step 3.5 — History loader overlap adjustment

**File**: `src/lib/ai/history-loader.ts`

When DAG summaries are present, skip overlap tokens entirely (the DAG provides the context bridge). Already partially implemented — `overlapTokens: session.rolling_summary ? 0 : undefined` — just extend the condition to check for DAG nodes too.

### Step 3.6 — DAG integrity checks

**File**: `src/lib/ai/summary-dag.ts`

Add a `validateSummaryDAG` function (can be called from admin endpoints or diagnostics):

1. All nodes reference a valid session
2. Parent-child depth is consistent (parent.depth = max(child.depth) + 1)
3. No orphan nodes (every non-root node has a parent or is a leaf)
4. Source message IDs exist in tenant_messages
5. Token counts are non-negative and plausible

### Step 3.7 — Tests

**Files**:
- `src/lib/ai/summary-dag.test.ts` — DAG creation, condensation, assembly, integrity
- `src/lib/ai/session-summarizer.test.ts` — Updated for DAG output, escalation, backward compat
- `src/lib/ai/__tests__/summary-dag-integration.test.ts` — End-to-end: messages → leaf → condensation → context assembly

---

## Migration Strategy

### Rollout order
1. Phase 1 (adaptive threshold) — deploy independently, no data migration needed
2. Phase 2 (conversation search) — deploy independently, migration adds index + RPC
3. Phase 3 (summary DAG) — deploy with feature flag

### Phase 3 feature flag
Add to `tenant_memory_settings`:
```sql
ALTER TABLE tenant_memory_settings
  ADD COLUMN IF NOT EXISTS summary_mode TEXT NOT NULL DEFAULT 'flat'
    CHECK (summary_mode IN ('flat', 'dag'));
```

- `flat`: current behavior (rolling_summary overwrite)
- `dag`: new hierarchical behavior

This allows gradual rollout: enable DAG for specific tenants first, validate, then flip the default.

### Backward compatibility
- `rolling_summary` column stays populated as a cache of the root DAG summary
- Context assembler falls back to `rolling_summary` when no DAG nodes exist
- Old sessions (pre-migration) continue working unchanged
- The `conversation_search` tool works on all historical messages regardless of summary mode

---

## File Change Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | `supabase/migrations/00096_*.sql` | New migration |
| 1 | `src/lib/ai/model-resolver.ts` | Add contextWindowTokens to ResolvedModel |
| 1 | `src/lib/ai/session-summarizer.ts` | Adaptive threshold logic |
| 1 | `src/lib/ai/tenant-ai-worker.ts` | Pass contextWindowTokens |
| 2 | `supabase/migrations/00096_*.sql` | Add tsvector + RPC (can combine with Phase 1) |
| 2 | `src/lib/ai/conversation-search.ts` | New module |
| 2 | `src/lib/ai/tools/memory.ts` | Add conversation_search tool |
| 2 | `src/lib/ai/tool-docs.ts` | Document new tool |
| 3 | `supabase/migrations/00097_*.sql` | New table + indexes + RLS |
| 3 | `src/lib/ai/summary-dag.ts` | New module (DAG operations) |
| 3 | `src/lib/ai/session-summarizer.ts` | Rewrite for DAG + escalation |
| 3 | `src/lib/ai/context-assembler.ts` | Use DAG for summary context |
| 3 | `src/lib/ai/history-loader.ts` | Minor: skip overlap when DAG present |
| 3 | `tenant_memory_settings` migration | Add summary_mode column |

### Files NOT changed
- `src/lib/ai/pre-compaction-flush.ts` — unchanged, runs before leaf pass
- `src/lib/ai/memory-record-writer.ts` — unchanged, memory records are orthogonal to conversation summaries
- `src/lib/ai/memory-retrieval.ts` — unchanged
- `src/lib/ai/memory-scorer.ts` — unchanged
- `src/lib/ai/context-packer.ts` — unchanged (packs memories, not summaries)
