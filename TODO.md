# FarmClaw — Launch TODO

> Generated 2026-03-01. Overall completion: ~78%.

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Integration Checklist](#2-integration-checklist)
3. [Unfinished Features](#3-unfinished-features)
4. [Pre-Launch Blockers](#4-pre-launch-blockers)
5. [Technical Debt](#5-technical-debt)
6. [Post-Launch / Nice-to-Have](#6-post-launch--nice-to-have)

---

## 1. Environment Variables

### 1a. Local Development (`.env.local`)

Copy `.env.local.example` → `.env.local` and fill in values.

| Variable | Service | How to Get It |
|----------|---------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Project Settings → API → `service_role` key (never expose client-side) |
| `STRIPE_SECRET_KEY` | Stripe | Dashboard → Developers → API Keys → Secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` → prints `whsec_...` |
| `STRIPE_PRICE_ID` | Stripe | Products → $40/mo subscription price → copy Price ID (`price_...`) |
| `STRIPE_METERED_PRICE_ID` | Stripe | Products → metered usage price → copy Price ID (`price_...`) |
| `ANTHROPIC_API_KEY` | Anthropic | console.anthropic.com → API Keys (`sk-ant-...`) |
| `OPENAI_API_KEY` | OpenAI | platform.openai.com → API Keys — used for embeddings (text-embedding-3-small) + Whisper |
| `OPENROUTER_API_KEY` | OpenRouter | openrouter.ai → Keys — used for custom skill gen/test + docs AI |
| `DISCORD_BOT_TOKEN` | Discord | discord.com/developers → Application → Bot → Token |
| `FARMCLAW_BOT_SECRET` | Self-generated | Shared secret between bot and SaaS API — `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | — | `http://localhost:3000` for local dev |
| `ENCRYPTION_KEY` | Self-generated | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `ENCRYPTION_KEY_PREVIOUS` | Self-generated | Only needed during key rotation — leave blank normally |
| `ADMIN_EMAILS` | — | Your email address (comma-separated for multiple) |
| `FARMCLAW_EMAIL_DOMAIN` | — | `farmclaw.com` (or your dev domain) |
| `AGENTMAIL_API_KEY` | AgentMail | agentmail.to dashboard |
| `AGENTMAIL_WEBHOOK_SECRET` | AgentMail | Webhook settings in AgentMail dashboard |
| `AGENTMAIL_API_BASE_URL` | AgentMail | `https://api.agentmail.to` (default) |
| `EMAIL_RESEND_INGRESS_ENABLED` | — | `true` to keep Resend fallback active, `false` to disable |
| `RESEND_API_KEY` | Resend | resend.com dashboard (transitional — will be removed) |
| `RESEND_WEBHOOK_SECRET` | Resend | Webhook settings in Resend dashboard |
| `EMAIL_MAX_ATTACHMENT_BYTES` | — | `26214400` (25 MB, optional safety guard) |
| `CRON_SECRET` | Self-generated | `openssl rand -hex 32` |
| `TENANT_RUNTIME_PROCESSOR_TOKEN` | Self-generated | `openssl rand -hex 32` |
| `WORKFLOW_RUN_PROCESSOR_TOKEN` | Self-generated | `openssl rand -hex 32` |
| `TENANT_EXPORT_PROCESSOR_TOKEN` | Self-generated | `openssl rand -hex 32` |
| `TENANT_EXPORT_STORAGE_BUCKET` | Supabase | Name of a Supabase Storage bucket — create it as `tenant-exports` |
| `COMPOSIO_API_URL` | Composio | Optional — `https://api.composio.dev` |
| `COMPOSIO_API_KEY` | Composio | Optional — composio.dev dashboard |
| `TRIGGER_PROJECT_REF` | Trigger.dev | Project settings → Project ref (`proj_...`) |

### 1b. Production — Vercel (Next.js SaaS)

Set these in **Vercel → Project → Settings → Environment Variables**. All variables from 1a apply, with these changes:

| Variable | Production Value |
|----------|-----------------|
| `NEXT_PUBLIC_APP_URL` | `https://farmclaw.com` (your production domain) |
| `STRIPE_SECRET_KEY` | Live key `sk_live_...` (switch from test) |
| `STRIPE_WEBHOOK_SECRET` | Create a production webhook endpoint in Stripe dashboard pointing to `https://farmclaw.com/api/webhooks/stripe` |
| `STRIPE_PRICE_ID` | Live price ID for $40/mo subscription |
| `STRIPE_METERED_PRICE_ID` | Live price ID for metered usage |
| `NODE_ENV` | `production` (set automatically by Vercel) |

**Vercel Cron**: If using Vercel Cron for minute-level scheduling, the `CRON_SECRET` is also used to authenticate cron route calls. Set it in Vercel env vars.

**Trigger.dev**: After connecting your Trigger.dev project, set `TRIGGER_SECRET_KEY` (auto-provided by the Trigger.dev Vercel integration) and `TRIGGER_PROJECT_REF`.

### 1c. Production — Fly.io (Discord Bot)

Set these via `fly secrets set` in the `farmclaw-discord-bot` app:

| Variable | Notes |
|----------|-------|
| `DISCORD_BOT_TOKEN` | Same bot token as SaaS (single shared bot) |
| `FARMCLAW_BOT_SECRET` | Must match the value in Vercel |
| `FARMCLAW_API_URL` | `https://farmclaw.com` (production SaaS URL) |
| `PORT` | `8080` (Fly.io injects this, matches `fly.toml`) |

### 1d. Cloudflare Worker (Email Routing)

Set in `infra/cloudflare-email-worker/wrangler.toml`:

| Variable | Notes |
|----------|-------|
| `ROOT_DOMAIN` | `farmclaw.com` |
| `FORWARD_TO` | `ingress@inbound.farmclaw.com` (AgentMail ingress address) |
| `BLOCKED_SENDERS` | Optional comma-separated blocklist |

### 1e. Missing from `.env.local.example`

The following vars are used in code but **not listed** in the example file — add them:

| Variable | Used In | Notes |
|----------|---------|-------|
| `STRIPE_METERED_PRICE_ID` | `src/lib/stripe/config.ts`, scripts | Metered usage billing price |
| `TRIGGER_PROJECT_REF` | `trigger.config.ts` | Trigger.dev project ref |

---

## 2. Integration Checklist

### Supabase
- [ ] Create Supabase project
- [ ] Run all 55 migrations (`supabase/migrations/00001–00055`)
- [ ] Create `tenant-exports` storage bucket
- [ ] Enable pgvector extension (migration 00045 handles this)
- [ ] Verify RLS policies are active on all tenant tables
- [ ] Set up Supabase Auth with magic link provider
- [ ] Configure Auth redirect URLs for production domain

### Stripe
- [ ] Create $40/mo subscription product + price
- [ ] Create metered usage price (per-unit for API overage)
- [ ] Set up webhook endpoint → `https://yourdomain.com/api/webhooks/stripe`
- [ ] Subscribe to events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] Test checkout flow end-to-end with test keys
- [ ] Migrate `report-stripe-usage.ts` to Stripe SDK v20 API (TODO at line ~75)

### Discord
- [ ] Create Discord application at discord.com/developers
- [ ] Enable bot with `MESSAGE_CONTENT`, `GUILDS`, `GUILD_MESSAGES`, `DIRECT_MESSAGES` intents
- [ ] Generate bot invite URL with required permissions (Send Messages, Read Messages, Embed Links, Attach Files)
- [ ] Deploy bot to Fly.io (`cd bot && fly deploy`)
- [ ] Verify bot health endpoint responds at `:8080/health`
- [ ] Test message ingress → SaaS API → LLM response → Discord reply loop

### Anthropic (Claude)
- [ ] Get API key from console.anthropic.com
- [ ] Verify `claude-sonnet-4-5-20250514` model access
- [ ] Test a tenant runtime LLM call end-to-end
- [ ] Set spending limits on Anthropic dashboard as safety net

### OpenAI
- [ ] Get API key from platform.openai.com
- [ ] Verify `text-embedding-3-small` model access (for embeddings)
- [ ] Verify `whisper-1` model access (for voice transcription)
- [ ] Test embedding generation for a knowledge document

### OpenRouter
- [ ] Get API key from openrouter.ai
- [ ] Used for: custom skill AI generation, custom skill testing, docs AI search
- [ ] Verify model access (used in `/api/custom-skills/*/generate` and `/api/docs/ask`)

### Trigger.dev
- [ ] Create Trigger.dev account and project
- [ ] Install Vercel integration (auto-sets `TRIGGER_SECRET_KEY`)
- [ ] Set `TRIGGER_PROJECT_REF` in env vars
- [ ] Deploy tasks: `npx trigger.dev@latest deploy`
- [ ] Verify all 10 tasks are registered:
  - `process-runtime-run` — LLM execution
  - `process-cron-schedules` — daily briefings, scheduled messages
  - `process-inbound-email` — email ingestion
  - `transcribe-voice-message` — Whisper transcription
  - `index-knowledge-document` — document chunking + embedding
  - `check-spending` — spending cap enforcement
  - `report-stripe-usage` — metered billing daily report
  - `capture-launch-readiness` — release gate capture
  - `process-workflow-schedules` — workflow scheduling
  - `process-workflow-runs` — workflow execution
- [ ] Set up scheduled triggers for `process-cron-schedules` and `report-stripe-usage`

### AgentMail (Primary Email)
- [ ] Create AgentMail account
- [ ] Get API key and webhook secret
- [ ] Set up webhook endpoint → `https://yourdomain.com/api/webhooks/agentmail`
- [ ] Configure email domain (farmclaw.com) for sending

### Resend (Transitional Email Fallback)
- [ ] Get API key and webhook secret
- [ ] Set up webhook endpoint → `https://yourdomain.com/api/webhooks/resend`
- [ ] Can disable via `EMAIL_RESEND_INGRESS_ENABLED=false` once AgentMail is stable

### Cloudflare (Email Routing Worker)
- [ ] Deploy worker from `infra/cloudflare-email-worker/`
- [ ] Configure DNS MX records for farmclaw.com
- [ ] Set `ROOT_DOMAIN` and `FORWARD_TO` in `wrangler.toml`
- [ ] Test inbound email routing end-to-end

### Composio (Optional — Third-Party Tool Connections)
- [ ] Create Composio account (optional, runs in mock mode without it)
- [ ] Set `COMPOSIO_API_URL` and `COMPOSIO_API_KEY`
- [ ] Test toolkit discovery and OAuth connector flows

### Vercel (Deployment)
- [ ] Connect GitHub repo to Vercel
- [ ] Set all env vars from section 1b
- [ ] Verify `npm run build` passes
- [ ] Set up custom domain (farmclaw.com)
- [ ] Enable Vercel Cron if using minute-level scheduling

### Fly.io (Discord Bot)
- [ ] Install Fly CLI (`brew install flyctl`)
- [ ] `cd bot && fly launch` (or `fly deploy` if app already created)
- [ ] `fly secrets set DISCORD_BOT_TOKEN=... FARMCLAW_BOT_SECRET=... FARMCLAW_API_URL=...`
- [ ] Verify single machine running in `iad` region
- [ ] Monitor via `fly logs`

---

## 3. Unfinished Features

### 3a. Blocking for Launch

| Feature | Status | What's Left |
|---------|--------|-------------|
| **Stripe SDK v20 migration** | ~90% | `report-stripe-usage.ts` has TODO to update SDK usage pattern |
| **End-to-end conversation test** | 0% | Need staging proof that Discord → ingress → AI worker → tool call → Discord response works |
| **Grain bid scraper verification** | ~80% | Confirm Playwright scraper completes for all 6 elevator chains (CHS, ADM, Cargill, AGP, Columbia, Gavilon) |
| **Weather API verification** | ~80% | Verify NWS API integration with real coordinates |
| **Approval → Discord notification** | 0% | When a tool needs approval, notify the farmer in Discord and let them approve/deny inline |
| **Spending cap warning alerts** | ~50% | Email alerts at 80%/100% cap exist but Discord notification to farmer not wired |

### 3b. Partially Complete (Ship with degraded experience OK)

| Feature | Status | What's Left |
|---------|--------|-------------|
| **Conversation replay UI** | ~60% | `conversation-replay.tsx` exists but tool invocation details, attachment rendering, and approval history not shown |
| **Briefing preview/test** | ~75% | Scheduling works, but no "Send test briefing now" button |
| **Bulk knowledge upload** | ~50% | Single file upload works; no batch UI, progress tracking, or dedup detection |
| **Tenant exports** | ~80% | Export works; import dry-run endpoint stubbed but import processor not wired |
| **Approvals UI** | ~70% | List + decide works; no bulk actions, no SLA tracking |
| **Memory retrieval diagnostics** | ~60% | `memory-retrieval-diagnostics-panel.tsx` exists but metrics (recall, precision, hit rate) not instrumented |
| **Cost analytics dashboard** | ~60% | Metered tracking works; customer-facing breakdown by model/agent/skill not built |
| **Admin observability dashboard** | ~50% | Component skeleton exists; real-time metrics, dead-letter UI, and feature flag toggles not wired |

### 3c. Not Started (Defer to Post-Launch)

| Feature | Notes |
|---------|-------|
| **Multi-user / team support** | `tenant_members` + `tenant_roles` tables exist but no invitation flow, role assignment UI, or permission model |
| **Live WebSocket streaming** | HTTP multi-part responses work; token-by-token streaming to Discord not built |
| **Proactive suggestions** | `proactive-suggestions.ts` exists but pattern mining and real-time suggestion scoring are skeletons |
| **Multi-turn tool interactions** | Single-turn tool calls work; multi-step forms (e.g., guided scale ticket entry) not implemented |
| **Slack integration** | Discord-only for launch; no Slack code exists |
| **Data retention auto-purge** | No auto-cleanup of old messages/memories; manual export only |
| **GDPR right-to-be-forgotten** | Export exists but automated deletion workflow not built |

---

## 4. Pre-Launch Blockers

These must be verified before allowing real paying customers:

- [ ] **Full conversation loop**: Discord message → bot ingress → API → Trigger.dev `process-runtime-run` → AI worker → tool calls → Discord reply
- [ ] **Scale ticket OCR**: Upload a real scale ticket photo via Discord → verify Claude vision extracts fields correctly
- [ ] **Voice message**: Send a voice note in Discord → verify Whisper transcription → AI response
- [ ] **Morning briefing**: Set a briefing schedule → verify `process-cron-schedules` fires → briefing message appears in Discord
- [ ] **Stripe billing**: Sign up → $40/mo charge → use API → metered usage recorded → next invoice includes overage
- [ ] **Spending cap**: Set a $5 spending cap → verify LLM calls stop when cap reached → farmer gets notification
- [ ] **Knowledge upload**: Upload a PDF → verify `index-knowledge-document` chunks and embeds it → ask a question that requires that knowledge → verify retrieval
- [ ] **Memory persistence**: Have a conversation mentioning farm details → start new session → verify memory retrieval includes those details
- [ ] **Tool approval**: Configure a tool as "requires approval" → trigger it → verify approval prompt appears → approve → verify tool completes

---

## 5. Technical Debt

| Item | File(s) | Severity |
|------|---------|----------|
| Stripe SDK v20 migration TODO | `src/trigger/report-stripe-usage.ts` | Medium |
| Reranker uses hardcoded 0.8 confidence threshold | `src/lib/ai/reranker.ts` | Low |
| Memory dedup potential race in concurrent writes | `supabase/migrations/00049_atomic_memory_dedup.sql` | Medium |
| Composio integration may be entirely mocked | `src/lib/composio/client.ts` | Low (optional feature) |
| Workflow builder frozen at 60% — dead code | `src/lib/workflows/`, settings pages | Low (deprecated) |
| Legacy VPS code still in repo (deleted in git but in working tree) | `docker/`, `src/lib/hetzner/`, `src/lib/coolify/` | Low (cleanup) |
| `.env.local.example` missing `STRIPE_METERED_PRICE_ID` and `TRIGGER_PROJECT_REF` | `.env.local.example` | Low |
| No OpenAPI/Swagger spec for the 70+ API routes | — | Medium |
| Only ~13 test files; no E2E or integration tests | — | High |

---

## 6. Post-Launch / Nice-to-Have

- [ ] Team/multi-user support (invitations, roles, permissions)
- [ ] WebSocket streaming for real-time typing in Discord
- [ ] Proactive suggestion engine (behavioral patterns → nudges)
- [ ] Multi-turn tool wizards (guided scale ticket entry, confirmation loops)
- [ ] Slack channel support
- [ ] Advanced observability dashboard (latency p95/p99, per-tenant health, live event stream)
- [ ] Cost forecasting and trend analysis for farmers
- [ ] Data retention policies and auto-purge
- [ ] GDPR automated deletion workflow
- [ ] Knowledge bulk upload with progress tracking
- [ ] Export → import round-trip for tenant migration
- [ ] Custom tool IDE with sandbox execution
- [ ] OpenAPI spec generation for all API routes
- [ ] E2E test suite covering full conversation flows
- [ ] Load testing harness for 50+ concurrent tenants
