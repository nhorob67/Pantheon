# Phase 0: Tool-Path Inventory

Last updated: March 16, 2026
Status: Baseline snapshot

## Purpose

Maps every tool to its execution path, policy coverage, approval coverage, audit trail, and database tables. This is the Phase 0.2 deliverable for the Runtime Excellence Plan.

## Legend

- **Path**: LLM = called by model via `generateText()`, Runtime = called via `tenant-runtime-tools.ts`
- **Policy**: Whether `evaluateTenantToolPolicy()` is applied before execution
- **Approval**: Whether the tool can pause for human approval via `tenant_approvals`
- **Audit**: Whether durable invocation records are created (beyond conversation traces)
- **Telemetry**: Whether per-invocation latency/success records are captured (NEW via Phase 0.1)

## Tool Inventory

### Memory Tools (`src/lib/ai/tools/memory.ts`)

| Tool | Path | Policy | Approval | Audit | Telemetry | DB Tables |
|------|------|--------|----------|-------|-----------|-----------|
| `memory_write` | LLM | No | No | No (memory record only) | Yes (NEW) | `tenant_memory_records` |
| `memory_search` | LLM | No | No | No | Yes (NEW) | `tenant_memory_records` (read) |
| `memory_read` | LLM | No | No | No | Yes (NEW) | `tenant_memory_records` (read) |

**Runtime counterparts:**
| Tool | Path | Policy | Approval | Audit | Telemetry | DB Tables |
|------|------|--------|----------|-------|-----------|-----------|
| `tenant_memory_write` | Runtime | Yes | Yes | Yes (`tenant_tool_invocations`) | No | `tenant_memory_records` |
| `tenant_memory_search` | Runtime | Yes | No | Yes (`tenant_tool_invocations`) | No | `tenant_memory_records` (read) |

**Gap:** LLM-path memory tools have no policy, approval, or audit. Runtime-path tools have full governance. Same underlying data, different access controls.

---

### Schedule Tools (`src/lib/ai/tools/schedules.ts`)

| Tool | Path | Policy | Approval | Audit | Telemetry | DB Tables |
|------|------|--------|----------|-------|-----------|-----------|
| `schedule_create` | LLM | No | No | `created_by` field only | Yes (NEW) | `tenant_scheduled_messages` |
| `schedule_list` | LLM | No | No | No | Yes (NEW) | `tenant_scheduled_messages` (read) |
| `schedule_toggle` | LLM | No | No | No | Yes (NEW) | `tenant_scheduled_messages` |
| `schedule_delete` | LLM | No | No | No | Yes (NEW) | `tenant_scheduled_messages` |

**No runtime counterpart exists.**

**Gap:** Schedule mutations are unaudited and unapproved. An agent can create arbitrary cron jobs with no human oversight. Limit of 25 custom schedules is the only guardrail.

---

### Self-Config Tools (`src/lib/ai/tools/self-config.ts`)

| Tool | Path | Policy | Approval | Audit | Telemetry | DB Tables |
|------|------|--------|----------|-------|-----------|-----------|
| `config_view_my_config` | LLM | Role-gated (viewer) | No | No | Yes (NEW) | `tenant_agents` (read) |
| `config_list_agents` | LLM | Role-gated (viewer) | No | No | Yes (NEW) | `tenant_agents` (read) |
| `config_set_my_goal` | LLM | Role-gated (operator) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents` |
| `config_set_my_role` | LLM | Role-gated (operator) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents` |
| `config_set_my_backstory` | LLM | Role-gated (operator) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents` |
| `config_set_display_name` | LLM | Role-gated (admin) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents` |
| `config_set_my_autonomy` | LLM | Role-gated (admin) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents` |
| `config_toggle_skill` | LLM | Role-gated (admin) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents` |
| `config_set_my_delegation` | LLM | Role-gated (admin) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents` |
| `config_update_team_profile` | LLM | Role-gated (owner) | No | `tenant_config_changelog` | Yes (NEW) | `team_profiles` |
| `config_create_agent` | LLM | Role-gated (owner) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents` |
| `config_archive_agent` | LLM | Role-gated (owner) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents` |
| `config_undo_last_change` | LLM | Role-gated (admin) | No | `tenant_config_changelog` | Yes (NEW) | `tenant_agents`, `team_profiles` |

**No runtime counterpart exists.**

**Gap:** Self-config tools have role-based gating (checked at execute time, not via policy layer) and audit via `tenant_config_changelog`, but are NOT routed through the approval system. High-impact operations like `config_create_agent`, `config_set_my_autonomy`, and `config_archive_agent` execute immediately without human approval.

---

### Credential Tools (`src/lib/ai/tools/credentials.ts`)

| Tool | Path | Policy | Approval | Audit | Telemetry | DB Tables |
|------|------|--------|----------|-------|-----------|-----------|
| `use_credential` | LLM | No | No | `tenant_secret_audit_log` (handle_created) | Yes (NEW) | `tenant_secrets` (read) |
| `reveal_secret` | LLM → Runtime bridge | Yes (via `executeTenantExternalToolInvocation`) | Yes | `tenant_secret_audit_log` + `tenant_tool_invocations` | Yes (NEW) | `tenant_secrets` (read) |

**Gap:** `use_credential` bypasses policy/approval. `reveal_secret` is one of only two LLM-path tools that bridges to the runtime approval system.

---

### HTTP Request Tool (`src/lib/ai/tools/http-request.ts`)

| Tool | Path | Policy | Approval | Audit | Telemetry | DB Tables |
|------|------|--------|----------|-------|-----------|-----------|
| `http_request` | LLM | SSRF protection only | No | `tenant_secret_audit_log` (credential injection only) | Yes (NEW) | `tenant_secret_audit_log` |

**No runtime counterpart exists.**

**Gap:** No approval gating. No invocation records for HTTP requests themselves (only credential injection is audited). SSRF protection is solid but is not part of the unified policy system.

---

### Composio Tools (`src/lib/ai/tools/composio.ts`)

| Tool | Path | Policy | Approval | Audit | Telemetry | DB Tables |
|------|------|--------|----------|-------|-----------|-----------|
| `*` (dynamic) | LLM → Runtime bridge | Yes (via `executeTenantExternalToolInvocation`) | Yes | `tenant_tool_invocations` + audit_log | Yes (NEW) | `tenant_tools`, `tenant_tool_policies`, `tenant_tool_invocations`, `tenant_approvals` |

**This is the ONLY LLM-path tool category (besides `reveal_secret`) that goes through full runtime policy and approval.**

---

### Weather Tools (`src/lib/ai/tools/weather.ts`)

| Tool | Path | Policy | Approval | Audit | Telemetry | DB Tables |
|------|------|--------|----------|-------|-----------|-----------|
| `get_weather_forecast` | LLM | No | No | No | Yes (NEW) | None (external NWS API) |
| `get_weather_alerts` | LLM | No | No | No | Yes (NEW) | None (external NWS API) |

**No runtime counterpart exists.**

**Gap:** No governance at all. Low risk since read-only, but not visible in any audit trail.

---

### Runtime-Only Tools

#### Safe Tools (`src/lib/runtime/tenant-runtime-safe-tools.ts`)

| Tool | Path | Policy | Approval | Audit | Telemetry | DB Tables |
|------|------|--------|----------|-------|-----------|-----------|
| `echo` | Runtime | Yes | No | `tenant_tool_invocations` | No | None |
| `time` | Runtime | Yes | No | `tenant_tool_invocations` | No | None |
| `hash` | Runtime | Yes | No | `tenant_tool_invocations` | No | None |
| `uuid` | Runtime | Yes | No | `tenant_tool_invocations` | No | None |
| `base64_encode` | Runtime | Yes | No | `tenant_tool_invocations` | No | None |
| `base64_decode` | Runtime | Yes | No | `tenant_tool_invocations` | No | None |

**These tools are only available via the runtime path, not exposed to the LLM.**

---

## Summary: Governance Coverage Matrix

| Category | Tools | Policy | Approval | Audit Records | Telemetry |
|----------|-------|--------|----------|---------------|-----------|
| Memory (LLM) | 3 | None | None | None | **NEW** |
| Memory (Runtime) | 2 | Full | Full | Full | None |
| Schedules | 4 | None | None | Minimal | **NEW** |
| Self-Config | 13 | Role-gated only | None | `config_changelog` | **NEW** |
| Credentials | 2 | Partial | `reveal_secret` only | Partial | **NEW** |
| HTTP Request | 1 | SSRF only | None | Credential inject only | **NEW** |
| Composio | Dynamic | Full | Full | Full | **NEW** |
| Weather | 2 | None | None | None | **NEW** |
| Runtime Safe | 6 | Full | None | Full | None |

## Key Findings

### 1. Two-path split is real and deep
- **25 LLM-path tools** across 7 files, only Composio and `reveal_secret` bridge to the runtime policy system
- **8 runtime-path tools** across 3 files, all go through full policy/approval/audit
- The two paths share zero code for policy evaluation, approval, or invocation recording

### 2. Highest-risk ungoverned tools
1. **`schedule_create` / `schedule_delete`** — agent can create arbitrary cron jobs, no approval
2. **`config_create_agent` / `config_archive_agent`** — agent can create/destroy other agents, no approval
3. **`config_set_my_autonomy`** — agent can escalate its own autonomy level, no approval
4. **`memory_write`** — agent can write unlimited memories, no policy controls

### 3. Three separate policy systems
1. **Prompt-based soft controls** (`system-prompt.ts`) — "Tool Approval Required" / "Disabled Tools" sections
2. **Agent config overrides** (`registry.ts`) — `tool_approval_overrides` deletes tools from registry
3. **Runtime policy** (`tenant-runtime-policy.ts`) — `tenant_tool_policies` table with role/approval/rate checks

These three systems operate independently and can produce contradictory results.

### 4. What Phase 0.1 telemetry adds
The new `tool-telemetry.ts` wrapper captures per-invocation records for ALL LLM-path tools:
- Tool name, duration, success/failure, error class
- Written to `telemetry_events` table
- Covers both Discord worker and email worker paths
- Enables answering "how often is each tool called?" and "which tools fail most?" for the first time

### 5. Audit trail fragmentation
Tool audit data is scattered across 4 tables:
- `tenant_tool_invocations` — runtime-path tools only
- `tenant_config_changelog` — self-config tools only
- `tenant_secret_audit_log` — credential tools only
- `telemetry_events` — all LLM-path tools (NEW, lightweight counters)

Phase 1 should unify these into a single invocation record system.

## File Ownership Map

| File | Owner | Tools Defined | Governance Level |
|------|-------|---------------|------------------|
| `src/lib/ai/tools/memory.ts` | AI layer | 3 | None |
| `src/lib/ai/tools/schedules.ts` | AI layer | 4 | None |
| `src/lib/ai/tools/self-config.ts` | AI layer | 13 | Role-gated only |
| `src/lib/ai/tools/http-request.ts` | AI layer | 1 | SSRF only |
| `src/lib/ai/tools/credentials.ts` | AI layer | 2 | Partial (reveal_secret bridges to runtime) |
| `src/lib/ai/tools/composio.ts` | AI layer → Runtime bridge | Dynamic | Full |
| `src/lib/ai/tools/weather.ts` | AI layer | 2 | None |
| `src/lib/ai/tools/registry.ts` | AI layer | Registry (no tools) | Applies disable overrides only |
| `src/lib/ai/tools/tool-telemetry.ts` | AI layer | Wrapper (no tools) | Telemetry recording |
| `src/lib/runtime/tenant-runtime-tools.ts` | Runtime layer | Dispatcher | Full policy + approval + audit |
| `src/lib/runtime/tenant-runtime-mutating-tools.ts` | Runtime layer | 2 | Via dispatcher |
| `src/lib/runtime/tenant-runtime-query-tools.ts` | Runtime layer | 1 | Via dispatcher |
| `src/lib/runtime/tenant-runtime-safe-tools.ts` | Runtime layer | 6 | Via dispatcher |
| `src/lib/runtime/tenant-runtime-policy.ts` | Runtime layer | Policy evaluator | N/A |
