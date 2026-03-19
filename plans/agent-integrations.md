# Plan: Agent-Driven Integration Setup & Automation

## Problem

Agents can't set up integrations with external services. When a user asks "start tracking metrics for our Discourse community," the agent correctly identifies it lacks the capability—but all the building blocks exist. The agent has `http_request`, `web_search`, `web_fetch`, `use_credential`, and `schedule_create` tools. The `connector_accounts` / `connector_providers` tables exist for secret storage. What's missing is the glue: the agent doesn't know it *can* do this, there's no tool to store credentials, and there's no integration registry that ties credentials to scheduled API calls.

## Design Goals

1. **User gives API key → agent stores it securely** via a new `integration_store_credential` tool
2. **Agent researches the API** via existing `web_search` / `web_fetch` tools
3. **Agent configures the integration** by registering it in a new `tenant_integrations` table
4. **Agent creates scheduled jobs** that use the integration (via existing `schedule_create` + `http_request`)
5. **Agent is self-aware** of this capability via system prompt additions
6. **Open-ended** — works for Discourse, GitHub, Jira, Stripe, Slack, any REST API

---

## Phase 1: Integration Registry (Database)

### New migration: `tenant_integrations` table

```sql
CREATE TABLE tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Identity
  slug TEXT NOT NULL,                          -- e.g. "discourse", "github", "jira"
  display_name TEXT NOT NULL,                  -- e.g. "Fullstack Ag Discourse"
  service_type TEXT NOT NULL,                  -- e.g. "discourse", "github", "generic-rest"

  -- Connection details
  base_url TEXT,                               -- e.g. "https://community.fullstackag.com"
  connector_account_id UUID REFERENCES connector_accounts(id) ON DELETE SET NULL,
  auth_method TEXT NOT NULL DEFAULT 'api_key', -- api_key | bearer | basic | header
  auth_header TEXT DEFAULT 'Api-Key',          -- custom header name if needed

  -- Agent-discovered metadata (populated during setup)
  api_docs_url TEXT,                           -- URL agent found for API docs
  discovered_endpoints JSONB DEFAULT '[]',     -- endpoints the agent identified
  capabilities_summary TEXT,                   -- agent's natural-language summary of what the API can do

  -- Configuration
  config JSONB NOT NULL DEFAULT '{}',          -- service-specific config (rate limits, default params, etc.)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_used_at TIMESTAMPTZ,
  last_error TEXT,

  -- Metadata
  created_by_agent_id UUID REFERENCES tenant_agents(id) ON DELETE SET NULL,
  setup_conversation_id TEXT,                  -- conversation where integration was set up
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tenant_integrations_slug_unique UNIQUE (tenant_id, slug),
  CONSTRAINT tenant_integrations_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$')
);

-- RLS: customer-scoped
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
-- (standard customer_id policies)
```

### Link table: `tenant_integration_schedules`

```sql
CREATE TABLE tenant_integration_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES tenant_integrations(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES tenant_scheduled_messages(id) ON DELETE CASCADE,
  purpose TEXT,  -- "daily-metrics-pull", "weekly-report", etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

This links integrations to their scheduled jobs so we can show "this integration runs these cron jobs" in the UI.

---

## Phase 2: New Native Tools (4 tools)

Add to `tool-catalog.ts` and implement in the runtime:

### 2a. `integration_store_credential`
- **Category:** `integrations`, **Risk:** `high`
- **Input:** `{ service_slug, api_key, auth_method?, auth_header?, metadata? }`
- **Behavior:** Encrypts the API key via `encryptConnectorSecret()`, upserts into `connector_accounts` (reusing the existing table), returns a credential handle ID
- **Why new tool vs `use_credential`:** `use_credential` reads credentials; this one writes them. The agent needs a way to accept a user-provided API key and store it. Approval required (high risk).

### 2b. `integration_register`
- **Category:** `integrations`, **Risk:** `medium`
- **Input:** `{ slug, display_name, service_type, base_url, connector_account_id, auth_method, auth_header?, api_docs_url?, discovered_endpoints?, capabilities_summary?, config? }`
- **Behavior:** Creates a row in `tenant_integrations`. This is the agent saying "I've set up this integration and here's what I learned about it."
- **Returns:** The integration ID

### 2c. `integration_list`
- **Category:** `integrations`, **Risk:** `low`
- **Input:** `{ status? }`
- **Behavior:** Lists all integrations for the tenant, with their connection status and linked schedules
- **Returns:** Array of integration summaries

### 2d. `integration_api_call`
- **Category:** `integrations`, **Risk:** `medium`
- **Input:** `{ integration_slug, method, path, query_params?, body?, headers? }`
- **Behavior:** Resolves the integration's `base_url` + `connector_account_id`, decrypts the credential, injects it into the request headers, makes the HTTP call. Essentially a wrapper around `http_request` that auto-injects credentials from the integration registry.
- **Returns:** HTTP response (status, headers, body)
- **Why not just `http_request`:** The user shouldn't have to provide the API key every time. The agent shouldn't have to `reveal_secret` and paste it. This tool auto-injects stored credentials, keeping secrets out of the conversation context.

---

## Phase 3: System Prompt — Integration Awareness

### 3a. Add integration context to `AgentSoulData`

```typescript
interface AgentSoulData {
  // ... existing fields ...
  integrations: Array<{
    slug: string;
    display_name: string;
    service_type: string;
    base_url: string;
    capabilities_summary: string | null;
  }>;
}
```

### 3b. Add integration section to `renderAgentSoul()`

New section in the system prompt (after Schedule Management):

```markdown
## Integration Management

You can set up and use integrations with external services (APIs). When a user asks
you to connect to a service like Discourse, GitHub, Jira, Linear, Notion, or any
REST API:

1. **Ask for credentials**: Request the API key or token from the user
2. **Store it securely**: Use `integration_store_credential` — never store keys in
   memory or conversation
3. **Research the API**: Use `web_search` and `web_fetch` to find the service's API
   documentation. Identify available endpoints, authentication method, and rate limits.
4. **Register the integration**: Use `integration_register` to save what you've
   learned about the API, including the base URL, auth method, and discovered endpoints
5. **Test it**: Make a simple API call with `integration_api_call` to verify the
   connection works
6. **Set up automation**: Offer to create scheduled jobs (cron) for recurring data
   pulls, reports, or monitoring using `schedule_create`

When you already have integrations configured, use `integration_api_call` to interact
with them — it automatically handles authentication.
```

### 3c. Inject active integrations into prompt

In `buildSystemPrompt()`, query `tenant_integrations` for the agent's tenant and append:

```markdown
## Active Integrations

You have the following integrations configured and ready to use:
- **Fullstack Ag Discourse** (`discourse`) — https://community.fullstackag.com
  Capabilities: User management, topic/post CRUD, category management, site statistics, search
  Linked schedules: daily-metrics-pull (0 8 * * *)
```

This gives the agent awareness of what's already set up so it can use integrations without re-setup.

---

## Phase 4: Integration-Aware Schedules

### 4a. Enhanced schedule prompt template

When an agent creates a schedule that uses an integration, the schedule's prompt should reference the integration by slug. Example schedule prompt for a daily Discourse metrics pull:

```
Use integration_api_call with integration "discourse" to:
1. GET /admin/dashboard.json — pull site statistics
2. GET /admin/reports/topics.json?period=daily — pull daily topic count
3. GET /admin/reports/posts.json?period=daily — pull daily post count
Compile into a summary and post it to this channel.
```

### 4b. Link tracking

When an agent creates a schedule that references an integration, insert a row into `tenant_integration_schedules` so the relationship is visible in the UI.

---

## Phase 5: Settings UI

### 5a. Integrations settings page

New page at `/dashboard/settings/integrations` (or enhance existing):

- **List view**: Shows all registered integrations with status, last used, linked schedules
- **Detail view**: Shows integration details, discovered endpoints, capabilities, credential status (masked), linked schedules
- **Actions**: Test connection, disable/enable, delete, edit base URL
- **Manual add**: Form to add an integration without going through the agent (power users)

### 5b. Integration card in agent settings

In the agent config panel, show which integrations the agent has set up and link to the integration detail page.

---

## Phase 6: Runtime Implementation

### 6a. Tool implementations (`src/lib/runtime/tenant-integrations.ts`)

New file with:
- `storeIntegrationCredential()` — encrypt + upsert into `connector_accounts`, auto-create `connector_providers` row if service type is new
- `registerIntegration()` — insert into `tenant_integrations`
- `listIntegrations()` — query with joined schedule info
- `executeIntegrationApiCall()` — resolve integration → decrypt credential → inject auth → make HTTP request → update `last_used_at`

### 6b. Tool registration

Add the 4 new tools to `NATIVE_TOOLS` in `tool-catalog.ts` with appropriate risk levels and approval modes.

### 6c. Tool wiring in unified executor

Wire the new tools into `unified-tool-executor.ts` so they go through the same policy/guardrail/telemetry pipeline as all other tools.

---

## Phase 7: Validation & Security

### 7a. Zod validators (`src/lib/validators/integration.ts`)

- `integrationStoreCredentialSchema` — validates slug format, API key presence, auth method
- `integrationRegisterSchema` — validates base_url is HTTPS, slug format, required fields
- `integrationApiCallSchema` — validates method is GET/POST/PUT/PATCH/DELETE, path starts with `/`

### 7b. Security guardrails

- **Credential isolation**: API keys never appear in conversation context. `integration_api_call` injects them server-side.
- **URL allowlisting**: Optionally restrict `base_url` to HTTPS only
- **Rate limiting**: `integration_api_call` respects the standard `max_calls_per_hour` policy
- **Approval for credential storage**: `integration_store_credential` defaults to `approval_mode: "owner"` — the owner must approve storing a new API key

---

## Implementation Order

1. **Migration** — `tenant_integrations` + `tenant_integration_schedules` tables
2. **Types** — `src/types/integration.ts`
3. **Validators** — `src/lib/validators/integration.ts`
4. **Runtime functions** — `src/lib/runtime/tenant-integrations.ts`
5. **Tool catalog** — Add 4 tools to `tool-catalog.ts`
6. **Tool executor wiring** — Wire into `unified-tool-executor.ts`
7. **System prompt** — Update `AgentSoulData`, `renderAgentSoul()`, `buildSystemPrompt()`
8. **API routes** — `/api/tenants/[tenantId]/integrations` (CRUD for UI)
9. **Settings UI** — Integrations panel
10. **Tests** — Unit tests for validators, runtime functions, tool execution

---

## What This Enables (User Stories)

**The Discourse scenario from the screenshot:**
> User: "Start tracking metrics for our Fullstack Ag community on Discourse"
>
> Agent: "I can set that up! I'll need your Discourse API key. You can generate one at Settings → API → New API Key in your Discourse admin panel."
>
> User: provides API key
>
> Agent: *stores credential* → *searches "Discourse API documentation"* → *reads API docs* → *registers integration with discovered endpoints* → *tests connection with GET /site.json* → "Connected! Your Discourse community has 1,247 users and 8,432 topics. Want me to set up a daily metrics report?"
>
> User: "Yes, every morning at 8am"
>
> Agent: *creates schedule with integration_api_call for daily metrics pull* → "Done! Every day at 8:00 AM CT I'll pull your community stats and post a summary here."

**Other scenarios this enables:**
- "Connect to our Jira and create a weekly sprint summary every Friday"
- "Set up GitHub integration and notify us when new issues are opened" (via polling schedule)
- "Connect to our Stripe account and pull daily revenue reports"
- "Monitor our Discourse for unanswered posts every 4 hours"
