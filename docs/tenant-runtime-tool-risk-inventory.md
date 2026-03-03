# Tenant Runtime Tool Risk Inventory (Current Implementation)

Last updated: February 24, 2026  
Scope: Tools currently executable in central tenant runtime worker path

## Source of truth

1. Runtime execution switch in `src/lib/runtime/tenant-runtime-tools.ts`.
2. Tenant tool metadata/policy tables from `00036_tenant_runtime_foundation.sql`.

## Current runtime tool inventory

| Tool key | Current behavior | Side effects | Proposed risk class | Approval default recommendation |
|---|---|---|---|---|
| `echo` | Returns provided text payload | None | low | none |
| `time` | Returns current ISO timestamp | None | low | none |
| `hash` | Returns SHA-256 hash for input payload | None | low | none |
| `uuid` | Returns a generated UUIDv4 | None | low | none |
| `base64_encode` | Encodes UTF-8 payload to base64 | None | low | none |
| `base64_decode` | Decodes base64 payload to UTF-8 text | None | low | none |
| `tenant_memory_write` | Persists a new row into `tenant_memory_records` | Writes tenant memory records | high | always |

## Notes

1. Runtime now includes one mutating tool (`tenant_memory_write`) with mandatory approval queueing and invocation audit trail.
2. Additional mutating tools should continue to be introduced incrementally behind policy and approval gates.

## Next expansion checklist

1. Register each new tool in `tenant_tools` with explicit `risk_level`.
2. Define `tenant_tool_policies` with role allowlists, timeout, and approval mode.
3. Add invocation audit assertions in tests for success, denial, and approval-required paths.
4. Block rollout for any high/critical tool without end-to-end approval and audit coverage.
