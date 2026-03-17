# External Tool Integration Strategy

Last updated: March 16, 2026
Status: Proposed
Scope: Defines how Composio, MCP, and extension-installed tools converge in Pantheon's runtime

## Problem

Pantheon has three external tool integration paths that will exist simultaneously after Phase 3 ships:

1. **Composio** (`src/lib/ai/tools/composio.ts`) — Third-party SaaS integrations (Gmail, Slack, GitHub, etc.) via Composio SDK. Dynamic tool discovery, auto-registered in `tenant_tools`, policy-wrapped via `executeTenantExternalToolInvocation()`.

2. **MCP** (`src/lib/runtime/tenant-mcp.ts`) — Custom MCP server configs stored in `mcp_server_configs`. Currently config-only (CRUD), no runtime tool execution. Transport: stdio.

3. **Extensions** (`src/lib/extensions/trust-policy.ts`, `src/types/extensibility.ts`) — Extension marketplace with catalog, installations, versioned rollouts, and trust policies. Source types: local, npm, git, clawhub, internal.

Without a convergence strategy, these three paths will create:
- Three different policy evaluation flows
- Three different operator UX surfaces for managing external tools
- Namespace collisions between tools from different sources
- Confusion about which integration to use for a given use case

## Decision

### Long-term direction: MCP as the universal external tool protocol

MCP is the emerging standard for tool interop. Composio is a convenience wrapper that provides OAuth and SaaS integration out of the box. Extensions are Pantheon-specific packages.

**We do NOT deprecate Composio.** Composio provides value that raw MCP does not: managed OAuth flows, pre-built SaaS connectors, zero-config setup. Instead:

- Composio remains the recommended path for **SaaS integrations** (Gmail, Slack, GitHub, CRMs, etc.)
- MCP is the path for **custom tools and self-hosted services** (internal APIs, databases, specialized tooling)
- Extensions are the path for **Pantheon-native capabilities** (skill packs, tool bundles, platform-specific features)

### Shared policy layer

All three external tool types route through the **same unified policy evaluation** defined in the canonical tool lifecycle ADR:

```
evaluateUnifiedToolPolicy() → allowed | denied | requires_approval
```

This is already true for Composio (via `executeTenantExternalToolInvocation()`). MCP and extension tools MUST use the same path.

### Shared governance infrastructure

| Concern | Implementation | Shared? |
|---------|---------------|---------|
| Tool registration | `tenant_tools` table | Yes — all three write here |
| Policy evaluation | `evaluateUnifiedToolPolicy()` | Yes — single function |
| Approval queue | `tenant_approvals` table | Yes — same queue |
| Invocation records | `tenant_tool_invocations` table | Yes — same table |
| Trust policy | `extension_customer_trust_policies` | Extended to cover all sources |
| Rate limiting | `tenant_tool_policies.max_calls_per_hour` | Yes — per tool |
| Circuit breaker | `runWithCircuitBreaker()` | Yes — per tool key |

## Namespace Conventions

Tool keys in `tenant_tools` follow this pattern:

| Source | Namespace Pattern | Example |
|--------|------------------|---------|
| Native | `{tool_name}` | `memory_write`, `schedule_create` |
| Composio | `composio.{normalized_name}` | `composio.gmail_send_email` |
| MCP | `mcp.{server_key}.{tool_name}` | `mcp.github.create_issue` |
| Extension | `ext.{extension_id}.{tool_name}` | `ext.analytics-pack.run_report` |
| Browser | `browser.{action}` | `browser.navigate`, `browser.click` |

### Collision resolution

1. **Across sources**: Namespace prefixes prevent collisions by design.
2. **Within MCP**: If two MCP servers expose a tool with the same name, the `server_key` prefix disambiguates.
3. **Within Composio**: Composio tool names are already unique within the Composio SDK.
4. **Display names**: Not required to be unique. Operator UI shows both display name and tool key.

## Trust Policy Extension

The current `ExtensionTrustPolicy` supports source types: `local`, `npm`, `git`, `clawhub`, `internal`.

Extend to include external tool sources:

```typescript
type ExternalToolSourceType =
  // Existing extension sources
  | "local" | "npm" | "git" | "clawhub" | "internal"
  // New external tool sources
  | "composio"    // Composio-managed SaaS integrations
  | "mcp_stdio"   // MCP server via stdio transport
  | "mcp_http"    // MCP server via HTTP/SSE transport
  ;

interface UnifiedTrustPolicy {
  /** Which source types are allowed */
  allowed_source_types: ExternalToolSourceType[];
  /** Which source types require verification */
  require_verified_source_types: ExternalToolSourceType[];
  /** Per-source overrides */
  source_overrides?: Record<string, {
    max_tools?: number;          // Max tools from this source
    auto_approve?: boolean;      // Skip approval for this source
    allowed_tool_patterns?: string[];  // Glob patterns for allowed tool names
  }>;
}
```

**Defaults:**
- `composio`: allowed, not verified-required (Composio manages trust)
- `mcp_stdio`: allowed, verified-required (user-provided server)
- `mcp_http`: allowed, verified-required (external network endpoint)

## Tool Registration Flow

### Composio (existing, preserved)

```
1. Agent config includes composio_toolkits: ["gmail", "slack"]
2. createComposioTools() fetches raw tools from Composio SDK
3. ensureComposioTenantToolCatalog() upserts into tenant_tools + tenant_tool_policies
4. Tool wrapped with executeTenantExternalToolInvocation()
5. → Already unified
```

### MCP (new, Phase 3)

```
1. Tenant configures MCP server in mcp_server_configs (existing CRUD)
2. On agent run start: hydrateMcpTools(serverKey) connects to server, discovers tools
3. For each discovered tool:
   a. Upsert into tenant_tools with source metadata: { provider: "mcp", server_key, ... }
   b. Upsert default policy in tenant_tool_policies
   c. Create CanonicalToolDescriptor with execute fn that calls the MCP server
4. Tool wrapped with executeToolUnified() (same as all other tools)
5. On connection failure: mark tools as unavailable, return graceful error to model
```

### Extensions (future, deferred)

```
1. Customer installs extension from catalog
2. Extension manifest declares tools with schemas
3. Tools registered in tenant_tools with source metadata: { provider: "extension", extension_id }
4. Tools wrapped with executeToolUnified()
5. Trust policy evaluated per source type
```

## Operator UX

### Unified external tools settings page

Rather than separate settings pages for Composio, MCP, and extensions, provide a single **External Tools** page with sections:

```
External Tools
├── Connected Services (Composio)
│   ├── Gmail — 3 tools enabled
│   ├── Slack — 5 tools enabled
│   └── + Connect Service
├── Custom Servers (MCP)
│   ├── github-mcp — 12 tools, healthy
│   ├── internal-api — 3 tools, error (connection refused)
│   └── + Add Server
├── Extensions
│   ├── Analytics Pack — 2 tools enabled
│   └── Browse Marketplace
└── Trust Policy
    └── [Configure allowed sources, verification requirements]
```

Each tool, regardless of source, shows the same information:
- Tool key, display name, description
- Source (Composio / MCP server name / Extension name)
- Risk level, approval posture
- Enabled/disabled toggle
- Recent invocation count and error rate (from telemetry)

## Risk Level Assignment for External Tools

| Source | Default Risk | Rationale |
|--------|-------------|-----------|
| Composio (read-only) | medium | Network access, SaaS data |
| Composio (write/send) | high | Creates external side effects |
| MCP (any) | high | User-provided code, untrusted |
| Extension (internal) | medium | Pantheon-vetted |
| Extension (npm/git) | high | Community-provided |

Operators can override risk levels per tool via the settings UI.

## Secret and Credential Handling

| Source | Credential Model |
|--------|-----------------|
| Composio | Managed by Composio SDK (OAuth flows). Pantheon never sees raw tokens. |
| MCP | `env_vars` on server config, stored in `mcp_server_configs`. Passed to server process at startup. Must be encrypted at rest (Phase 3 task). |
| Extension | Via `tenant_secrets` vault if extension needs API keys. Same credential handle system as `http_request`. |

## Migration Impact

### What changes
- `tenant_tools.metadata` gains a `provider` field for all tools (currently only Composio sets this)
- `extension_customer_trust_policies` schema extends to cover `composio` and `mcp_*` source types
- MCP server health status added to `mcp_server_configs` or a new `mcp_server_health` table
- Unified external tools settings page replaces separate Composio and MCP settings

### What stays the same
- Composio tool wrapping pattern (already bridges to runtime policy)
- Extension trust policy evaluation logic (extended, not replaced)
- `tenant_tool_policies` schema (already supports all needed fields)
- Approval queue and invocation recording (already unified in runtime path)

## Open Questions

1. **MCP connection pooling**: Should MCP server connections persist across agent runs, or connect/disconnect per run? Persistent connections reduce latency but increase resource usage.

2. **MCP tool schema caching**: MCP tool schemas can change when servers update. How often should we re-discover? Options: per-run, hourly, on-demand.

3. **Cross-agent tool sharing**: Should MCP tools discovered by one agent be automatically available to other agents on the same tenant, or require explicit per-agent enablement?

4. **Composio → MCP migration path**: If a SaaS service becomes available via both Composio and an MCP server, should we prefer one? Recommendation: prefer Composio for managed OAuth, MCP for self-hosted.
