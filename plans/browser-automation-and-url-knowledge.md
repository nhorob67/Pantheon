# Plan: Browser Automation & URL-to-Knowledge Ingestion

## Feature 1: Browser Automation / Computer Use

### Current State

Pantheon already has **partial scaffolding** for browser tools:

- **Tool catalog** (`src/lib/runtime/tool-catalog.ts`): `browser_navigate`, `browser_click`, `browser_fill` are registered as native tools with `defaultStatus: "disabled"`
- **Tool registry** (`src/lib/ai/tools/registry.ts`): Browser tools are resolved but gated behind a feature flag + tenant status check
- **Guardrails** (`src/lib/runtime/guardrails.ts`): Browser-specific safeguards exist — max 25 actions, 2-min session duration, no-progress detection
- **Autonomy gating** (`src/lib/runtime/unified-tool-executor.ts`): `browser_click` and `browser_fill` require approval for L1/L2 agents; `browser_navigate` requires approval for L1 only

**What's missing:** The actual browser tool implementations — the code that launches a browser, navigates pages, clicks elements, fills forms, takes screenshots, and returns results.

### Implementation Plan

#### Phase 1: Browser Engine Integration

**1.1 — Choose and integrate a headless browser library**

- Use **Playwright** (MIT license, Chromium/Firefox/WebKit support)
- Add `playwright` and `@playwright/browser-chromium` as dependencies
- Create `src/lib/browser/engine.ts`:
  - `BrowserSessionManager` class — manages browser lifecycle per agent run
  - Pool of browser contexts with isolation (one context per agent run)
  - Configurable viewport (default 1280×720)
  - Auto-cleanup on session end or timeout
  - Resource limits: max concurrent sessions per tenant (2), max page load time (15s)

**1.2 — Create `src/lib/browser/session-store.ts`**

- In-memory session store (Map<runId, BrowserSession>)
- Session tracks: browser context, active page, action count, start time, screenshot history
- TTL-based cleanup (2 min max, matching existing guardrail config)
- Cleanup hook called from unified executor flush

#### Phase 2: Tool Implementations

**2.1 — Create `src/lib/ai/tools/browser.ts`** with these tool definitions:

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `browser_navigate` | Navigate to a URL | `url: string` | Page title, text excerpt, screenshot (base64) |
| `browser_click` | Click an element | `selector: string` | Updated page state + screenshot |
| `browser_fill` | Type into an input | `selector: string, value: string` | Updated page state + screenshot |
| `browser_screenshot` | Capture current page | `full_page?: boolean` | Screenshot (base64) |
| `browser_scroll` | Scroll the page | `direction: "up" \| "down", amount?: number` | Updated page state |
| `browser_select` | Select from dropdown | `selector: string, value: string` | Updated page state |
| `browser_close` | End browser session | — | Confirmation |

**2.2 — Accessibility-tree approach for element targeting**

- After each action, extract an accessibility snapshot (`page.accessibility.snapshot()`)
- Return a simplified element tree with numbered labels so the model can reference elements by index (e.g., "click element [3]")
- This avoids brittle CSS selector reliance — models work better with numbered element lists
- Fallback: accept CSS selectors for power users who provide them in skill instructions

**2.3 — Screenshot handling**

- Capture PNG screenshot after each navigation/interaction
- Compress to JPEG (quality 60) if > 200KB
- Return as base64 data URI for multimodal model consumption
- Store in-memory only (not persisted to DB or storage)

#### Phase 3: Safety & Policy

**3.1 — URL allowlist/blocklist per tenant**

- Add `browser_policy` JSONB column to `tenant_agents` or `team_profiles`:
  ```json
  {
    "allowed_domains": ["*.example.com", "docs.google.com"],
    "blocked_domains": ["*.bank.com", "mail.google.com"],
    "max_actions_per_run": 25,
    "max_session_seconds": 120
  }
  ```
- Default: no allowlist (all domains allowed), sensible blocklist (banking, email, social auth pages)
- Migration: add column with default `{}` (inherits global defaults)

**3.2 — Pre-navigation validation**

- In `browser_navigate`, check URL against tenant policy before loading
- Block `file://`, `javascript:`, `data:` schemes
- Block internal/private IP ranges (SSRF protection)
- Log all navigated URLs to `tenant_tool_invocations` for audit

**3.3 — Extend existing guardrails**

- The existing browser guardrails in `guardrails.ts` already handle max actions and no-progress detection
- Add: screenshot content analysis for sensitive data detection (Phase 2 — flag for later)
- Add: cookie/session isolation (Playwright contexts provide this natively)

#### Phase 4: Feature Flag & Rollout

**4.1 — Feature flag activation**

- Browser tools are already gated behind a feature flag in the registry
- Add `browser_automation` to `feature_flags` table (default: disabled)
- Admin UI toggle in fleet dashboard to enable per-tenant or globally
- Kill switch already exists in the unified executor pattern

**4.2 — Tool catalog updates**

- Add `browser_screenshot`, `browser_scroll`, `browser_select`, `browser_close` to `tool-catalog.ts`
- Set all new tools to `defaultStatus: "disabled"`, `riskLevel: "high"`
- Add autonomy gating entries for new tools

**4.3 — Update tool documentation**

- Add browser tool category to `tool-docs.ts`
- Include usage examples in generated tool docs

#### Phase 5: Deployment Considerations

**5.1 — Chromium binary**

- **Vercel (Next.js)**: Playwright Chromium is too large for serverless (~400MB). Options:
  - **Option A (Recommended)**: Run browser sessions on the **Fly.io bot** infrastructure where we control the runtime
  - **Option B**: Use a managed browser service (Browserbase, Browserless) via API — avoids binary management entirely
  - **Option C**: Use `@cloudflare/puppeteer` or similar serverless-compatible browser
- Decision needed: self-hosted vs managed browser service

**5.2 — If self-hosted (Option A)**

- Add Playwright to bot's Dockerfile on Fly.io
- Create internal API endpoint on bot for browser session management
- Next.js app calls bot's browser API via internal networking
- Scale bot to `shared-cpu-2x` with 512MB+ for browser workloads

**5.3 — If managed service (Option B)**

- Integrate Browserbase or Browserless API
- Create `src/lib/browser/provider.ts` abstracting the browser provider
- Store API key in encrypted secrets (existing `crypto.ts` pattern)
- Provider handles scaling, binary management, session isolation

#### Phase 6: UI (Settings Panel)

**6.1 — Browser settings component**

- New `src/components/settings/browser-settings-panel.tsx`
- Controls: enable/disable toggle, domain allowlist editor, max actions slider
- Accessible from agent settings page
- Show browser tool status in agent card

---

## Feature 2: URL-to-Knowledge Ingestion

### Current State

- `tenant_knowledge_items.source_type` already supports `'url'` as a valid value
- The knowledge parser handles PDF, DOCX, MD, TXT but has no URL fetching
- Knowledge panel UI only supports file upload (drag-and-drop)
- Limits: 20 files per tenant, 10MB per file, 500KB parsed, 2MB total parsed

### Implementation Plan

#### Phase 1: URL Fetching & HTML Parsing

**1.1 — Create `src/lib/knowledge/url-fetcher.ts`**

```typescript
interface UrlFetchResult {
  title: string;
  content: string;      // Cleaned markdown
  url: string;          // Final URL (after redirects)
  contentType: string;
  fetchedAt: string;
}

async function fetchUrlAsKnowledge(url: string): Promise<UrlFetchResult>
```

- Validate URL: must be `https://` (or `http://` upgraded), no private IPs (SSRF protection)
- Set reasonable timeout (10s) and max response size (5MB raw)
- Follow redirects (max 5 hops)
- User-Agent: `PantheonBot/1.0 (+https://pantheon.so)`
- Handle common content types:
  - `text/html` → parse with Readability + TurndownService (see 1.2)
  - `application/pdf` → pipe through existing PDF parser
  - `text/plain`, `text/markdown` → use directly

**1.2 — HTML-to-Markdown conversion**

- Use **`@mozilla/readability`** (Mozilla's Readability.js) to extract article content from HTML
- Use **`turndown`** (or `node-html-markdown`) to convert cleaned HTML to Markdown
- Strip: nav, footer, ads, scripts, styles, comments
- Preserve: headings, lists, tables, code blocks, links, images (as `![alt](url)`)
- Apply existing `sanitizeMarkdown()` from `parser.ts` as final cleanup
- Prepend metadata header:
  ```markdown
  # {page title}
  > Source: {url}
  > Fetched: {date}

  {content}
  ```

**1.3 — Add dependencies**

- `@mozilla/readability` — content extraction
- `linkedom` or `jsdom` — DOM parsing for Readability (linkedom is lighter)
- `turndown` — HTML to Markdown
- These are lightweight, well-maintained libraries

#### Phase 2: API Route

**2.1 — Extend knowledge upload API**

- Modify `POST /api/tenants/[tenantId]/knowledge` to accept a JSON body with `{ url: string, agent_id?: string }` in addition to the existing FormData (file upload)
- Content-Type detection: `multipart/form-data` → file upload path, `application/json` → URL fetch path
- URL path:
  1. Validate URL format (Zod `z.string().url()`)
  2. Check domain isn't blocked (reuse browser blocklist or separate knowledge blocklist)
  3. Call `fetchUrlAsKnowledge(url)`
  4. Create knowledge item with `source_type: 'url'`, store URL in metadata
  5. Parse & sanitize the fetched content through existing pipeline
  6. Trigger background indexing (existing Trigger.dev job)
  7. Return the created knowledge item

**2.2 — Update validator**

- Extend `knowledgeUploadSchema` in `src/lib/validators/knowledge.ts`:
  ```typescript
  knowledgeUrlSchema = z.object({
    url: z.string().url().max(2048),
    agent_id: z.string().uuid().nullable().optional()
  })
  ```

**2.3 — Deduplication**

- Before fetching, check if URL already exists in `tenant_knowledge_items` (match on `metadata.url`)
- If exists and active: return error "URL already added" with option to re-fetch
- Use `content_hash` column for content-level dedup across URL and file uploads

#### Phase 3: UI Updates

**3.1 — Add URL input to knowledge panel**

- Modify `src/components/settings/knowledge-panel.tsx`:
  - Add a text input field + "Add URL" button above or alongside the file drop zone
  - Input placeholder: "Paste a URL to add as knowledge..."
  - On submit: POST JSON to existing knowledge API endpoint
  - Show loading state while fetching + parsing
  - Display fetched page title on success

**3.2 — URL knowledge display**

- In the knowledge file list, show URL-sourced items with a `Globe` icon (from Lucide) instead of `FileText`
- Show the source URL as secondary text under the title
- Add "Re-fetch" action in the dropdown menu (re-fetches URL content and re-indexes)

**3.3 — Update knowledge manager hook**

- Add `addUrl(url: string)` method to `useKnowledgeManager`
- Handle loading/error states for URL fetching (may take longer than file upload)
- Add `urlInput` and `setUrlInput` state for the input field

#### Phase 4: Background Refresh (Optional / Future)

**4.1 — Scheduled re-fetch**

- Add optional `refresh_interval` to URL knowledge items (e.g., daily, weekly, never)
- Trigger.dev scheduled job to re-fetch stale URL knowledge
- Only update if `content_hash` changed (avoid unnecessary re-indexing)
- This is a natural extension but **not required for MVP**

---

## Migration Requirements

### New Migration: `00052_browser_and_url_knowledge.sql`

```sql
-- 1. Browser policy column on team_profiles
ALTER TABLE team_profiles
ADD COLUMN IF NOT EXISTS browser_policy jsonb
DEFAULT '{}';

-- 2. No schema changes needed for URL knowledge — source_type: 'url'
--    already supported in tenant_knowledge_items

-- 3. Add metadata.url index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_tki_metadata_url
ON tenant_knowledge_items ((metadata->>'url'))
WHERE source_type = 'url' AND status = 'active';

-- 4. Add browser tools to native tool catalog (done via ensureNativeToolCatalog)
```

---

## Dependency Summary

| Package | Purpose | Size |
|---------|---------|------|
| `playwright` | Browser automation engine | ~5MB (+ Chromium binary ~130-400MB, server-side only) |
| `@mozilla/readability` | Article content extraction | ~50KB |
| `linkedom` | Lightweight DOM for Readability | ~200KB |
| `turndown` | HTML → Markdown conversion | ~30KB |

**Or if using managed browser service:** Replace `playwright` with provider SDK (e.g., `@browserbasehq/sdk`).

---

## Implementation Order

1. **URL-to-Knowledge** (smaller scope, no infra decisions)
   - Phase 1: URL fetcher + HTML parser
   - Phase 2: API route extension
   - Phase 3: UI updates
   - Estimated files touched: ~8-10

2. **Browser Automation** (larger scope, requires infra decision)
   - Phase 1: Browser engine integration (after deciding self-hosted vs managed)
   - Phase 2: Tool implementations
   - Phase 3: Safety & policy
   - Phase 4: Feature flag activation
   - Phase 5: Deployment
   - Phase 6: UI settings
   - Estimated files touched: ~12-15

---

## Open Decisions

1. **Browser hosting**: Self-hosted on Fly.io (Option A) vs managed service like Browserbase (Option B)?
   - Option A: More control, lower cost at scale, but more ops burden
   - Option B: Faster to ship, handles scaling, but per-session cost
2. **URL knowledge refresh**: Include scheduled re-fetch in MVP or defer?
3. **Browser screenshot multimodal**: Requires vision-capable model — confirm model selection supports image inputs
