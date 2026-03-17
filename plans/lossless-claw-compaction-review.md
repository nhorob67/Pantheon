# Lossless Claw vs Pantheon: Memory Compaction Review

## Executive Summary

Lossless Claw (an OpenClaw plugin) and Pantheon take fundamentally different approaches to conversation memory. Lossless Claw treats the **conversation transcript itself** as the primary artifact and builds a DAG-based summarization tree over it. Pantheon treats **extracted memory records** as the primary artifact and uses a flat rolling summary for conversation continuity. Both approaches have merits — and there are three specific principles from Lossless Claw worth incorporating.

---

## How Each System Works

### Lossless Claw

1. **Every message persisted** in SQLite, never deleted
2. **Leaf summarization**: when context hits 75% of the model window, older message chunks (~20K tokens) get summarized into ~1,200-token leaf nodes
3. **DAG condensation**: leaf summaries are recursively summarized into higher-level nodes (configurable depth)
4. **Context assembly**: recent raw messages + compressed summary nodes, fit within token budget
5. **Drill-down tools**: `lcm_grep`, `lcm_describe`, `lcm_expand` let the agent explore compressed history on demand
6. **Large file interception**: files >25K tokens stored separately with dedicated summaries

### Pantheon

1. **Messages persisted** in `tenant_messages` table
2. **Rolling summary**: when unsummarized messages exceed ~6K tokens (and ≥8 messages), a single flat summary replaces them on the session
3. **Pre-compaction flush**: before summarizing, an LLM pass extracts important facts/preferences/commitments into `tenant_memory_records`
4. **Memory records**: typed (fact/preference/commitment/outcome/daily_log), tiered (working/episodic/knowledge), with embeddings, dedup, and confidence scoring
5. **Hybrid retrieval**: semantic + keyword search with RRF scoring, MMR diversity, contradiction filtering
6. **Context packing**: memories packed into system prompt within a 1,500-token budget

---

## Key Differences

| Dimension | Lossless Claw | Pantheon |
|---|---|---|
| **What's compressed** | The conversation transcript | Extracted facts/preferences |
| **Summary structure** | DAG (hierarchical, multi-level) | Flat rolling summary (single string) |
| **Original data** | Always recoverable via drill-down | Raw messages exist but aren't surfaced to the agent |
| **Agent access to history** | `lcm_expand` / `lcm_grep` tools | `memory_search` / `memory_read` tools |
| **Compaction trigger** | % of context window used | Token count threshold (6K) |
| **What survives compaction** | Everything (lossless by design) | Summary + extracted facts (lossy on conversation detail) |
| **Large content handling** | Intercepted and stored separately | Not addressed |

---

## Principles Worth Incorporating

### 1. Hierarchical Summary DAG (High Value)

**The problem**: Pantheon's `rolling_summary` is a single flat string that gets overwritten each compaction cycle. After several cycles, early conversation context is progressively diluted — each summary summarizes the previous summary, compounding information loss.

**What Lossless Claw does**: Maintains a tree of summaries. Leaf nodes summarize raw messages. Higher-level nodes summarize groups of leaf summaries. The structure preserves proportional detail at every depth.

**Recommendation**: Replace the single `rolling_summary` string with a `session_summary_nodes` table:

```
session_summary_nodes:
  id, session_id, parent_node_id, depth,
  summary_text, source_message_ids[], token_count,
  created_at
```

Context assembly would walk the tree: include the root summary for broad context + the most recent leaf summaries for recent detail. This prevents the "summary of a summary of a summary" degradation.

**Effort**: Medium. Requires a new migration, changes to `session-summarizer.ts` and `context-assembler.ts`. The pre-compaction flush and memory record writer stay unchanged.

### 2. Agent-Accessible History Drill-Down (Medium Value)

**The problem**: Pantheon agents can search **memory records** (extracted facts) but cannot search or expand the **conversation transcript**. If a user says "what did we discuss last Tuesday about the API redesign?", the agent can only rely on whatever facts happened to be extracted, not the actual conversation.

**What Lossless Claw does**: Provides `lcm_expand` (expand a summary node back to raw messages) and `lcm_grep` (search across all stored messages).

**Recommendation**: Add a `conversation_search` tool that queries `tenant_messages` with keyword/semantic matching, scoped to the tenant. This is distinct from `memory_search` — it searches actual conversation history rather than extracted knowledge.

```typescript
// New tool: conversation_search
// Searches tenant_messages by content, returns relevant excerpts
// Useful for "what did we talk about regarding X?"
```

**Effort**: Low-medium. The `tenant_messages` table already exists. Add a text search index and a new tool in `tools/`.

### 3. Adaptive Compaction Threshold (Low Value, Easy Win)

**The problem**: Pantheon triggers compaction at a fixed 6K token threshold. This doesn't adapt to the model's actual context window — a model with 200K context doesn't need compaction as aggressively as one with 8K.

**What Lossless Claw does**: Triggers at 75% of the **actual model context window**, configurable per deployment.

**Recommendation**: Make the compaction threshold a percentage of the model's context window rather than a fixed token count. The `model-registry.ts` already tracks model capabilities — wire the context window size into `session-summarizer.ts`.

```typescript
// Instead of:
const TOKEN_COMPACTION_THRESHOLD = 6000;

// Use:
const COMPACTION_RATIO = 0.60; // trigger at 60% of context
const threshold = modelContextWindow * COMPACTION_RATIO;
```

**Effort**: Low. Small change to `session-summarizer.ts` + pass model info through.

---

## Principles NOT Worth Incorporating

### Full Lossless Guarantee

Lossless Claw's core promise is that raw messages are always recoverable. Pantheon already persists all messages in `tenant_messages` — we're already lossless at the storage layer. The difference is that Lossless Claw makes this recoverable *to the agent at inference time*, which is addressed by recommendation #2 above without needing the full DAG machinery.

### SQLite-Based Storage

Lossless Claw uses SQLite as its persistence layer. Pantheon uses Supabase/PostgreSQL with RLS, which is the right choice for a multi-tenant SaaS platform. No change needed.

### Large File Interception

Lossless Claw intercepts files >25K tokens and stores them separately. Pantheon's knowledge system (`knowledge_files` + `knowledge-retrieval.ts`) already handles document management with chunking and retrieval. This is already solved differently but effectively.

---

## Recommended Implementation Order

1. **Adaptive compaction threshold** — quick win, prevents unnecessary compaction on large-context models
2. **Conversation search tool** — gives agents access to actual history, fills a real gap
3. **Summary DAG** — highest architectural value but most effort; do after the simpler wins validate the direction

---

## Impact on Existing Code

| File | Change Type | For Which Recommendation |
|---|---|---|
| `src/lib/ai/session-summarizer.ts` | Modify threshold logic | #3 (adaptive threshold) |
| `src/lib/ai/session-summarizer.ts` | Rewrite to produce DAG nodes | #1 (summary DAG) |
| `src/lib/ai/context-assembler.ts` | Read DAG instead of flat summary | #1 (summary DAG) |
| `src/lib/ai/history-loader.ts` | No change (already handles overlap) | — |
| `src/lib/ai/tools/memory.ts` | Add `conversation_search` tool | #2 (drill-down) |
| `src/lib/ai/model-registry.ts` | Export context window sizes | #3 (adaptive threshold) |
| `supabase/migrations/` | New table for summary nodes | #1 (summary DAG) |
| `src/lib/ai/pre-compaction-flush.ts` | No change | — |
| `src/lib/ai/memory-record-writer.ts` | No change | — |
