# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FarmClaw is a managed OpenClaw hosting platform for Upper Midwest row crop farmers. Each customer gets a fully configured multi-agent AI assistant system accessible through their farm's Discord server. The platform handles onboarding, billing ($40/month + metered API usage), farm skill provisioning, container orchestration, and an extension marketplace.

See `farmclaw-prd.md` for the full product requirements document.

## Current Status

~85% feature-complete. All code is uncommitted on the `main` branch (only commit is the initial Create Next App scaffold). The codebase contains ~329 TypeScript/TSX source files, 70 API routes, 80+ components, 25 database migrations, and 44 MDX documentation pages.

**What's fully built:** Provisioning pipeline, multi-agent system, email integration (AgentMail + Resend), extension marketplace with trust policies, custom skills with AI generation, knowledge file management, Composio integration, cost management with spending caps, admin fleet dashboard, user onboarding flow, built-in documentation site with search.

**What's partially wired:** Workflow visual builder (schema + migrations exist, UI may be partial), advanced upgrade orchestration, memory vault compression operations.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Node native test runner (6 test files: webhook-signature, processor-inputs, constant-time, openclaw-signature, cost-projection, onboarding-templates)
```

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5
- **Styling:** Tailwind CSS 4 with CSS variables (dark agricultural palette — see `globals.css`)
- **Auth/DB:** Supabase (PostgreSQL + Auth via magic links + RLS)
- **Payments:** Stripe 20.3.1 (subscriptions + metered usage billing)
- **Infrastructure:** Hetzner Cloud + Coolify (container orchestration)
- **Forms:** React Hook Form 7.71.1 + Zod 4.3.6 validation
- **State:** Zustand 5.0.11 (onboarding wizard, persisted to sessionStorage)
- **Charts:** Recharts 3.7.0
- **Icons:** Lucide React 0.563.0
- **Dates:** date-fns 4.1.0
- **Docs:** next-mdx-remote 6, remark-gfm, rehype-slug, shiki (syntax highlighting)
- **Search:** FlexSearch 0.8 (full-text docs search)
- **Document processing:** pdf-parse, mammoth (DOCX), gray-matter (frontmatter)
- **Fonts:** Plus Jakarta Sans (headlines), Outfit (body) — loaded via `next/font/google`

## Architecture

### Route Groups

- `src/app/(auth)/` — Login, signup, OAuth callback. Public routes.
- `src/app/(dashboard)/` — Protected routes: dashboard, onboarding wizard, settings (farm/channels/skills/tools/extensions/email/billing/alerts/knowledge/memory/integrations), usage analytics.
- `src/app/(admin)/` — Admin dashboard: customers, instances, upgrades, fleet health, revenue, usage analytics, extension rollouts.
- `src/app/(docs)/` — Built-in documentation site with dynamic `[...slug]` routing, sidebar navigation, search, and 44 MDX content pages under `content/docs/`.
- `src/app/api/` — 70 API route handlers for instance provisioning, management, agents, MCP servers, extensions, email, webhooks, custom skills, knowledge, memory, workflows, Composio, and admin operations.

### API Routes Overview

- **Customer APIs** (~10 routes) — Profile, email identity, alert preferences, spending cap
- **Instance Management** (~35 routes) — Provisioning, status/restart/stop, agents CRUD, config updates, skills, MCP servers, knowledge files, memory vault, workflows, Composio connections, deprovisioning
- **Custom Skills** (7 routes) — CRUD, AI generation, templates
- **Extensions** (~15 routes) — Catalog, installations, trust policies
- **Admin** (~20 routes) — Customers, instances, upgrades, analytics (fleet health, revenue, usage), spending alerts, email processing, extension rollouts
- **Webhooks** (4 routes) — Stripe, AgentMail, Resend, OpenClaw instance events
- **Stripe** — Checkout/portal sessions
- **Health** — Readiness check

### Core Libraries (`src/lib/`)

- `supabase/` — Three client variants: `client.ts` (browser), `server.ts` (server with cookies), `admin.ts` (service role, bypasses RLS). `middleware.ts` handles auth session refresh, CSRF protection, CSP headers, and route guards.
- `stripe/` — `client.ts` (checkout/portal sessions), `config.ts` (price IDs), `webhooks.ts` (event handlers)
- `coolify/` — REST client for container orchestration (156 lines). Set `COOLIFY_API_URL=mock` for development to use `mock.ts` instead.
- `hetzner/` — Hetzner Cloud API client (84 lines) with mock for development. `cloud-init.ts` provisions servers.
- `templates/` — Config builders and personality renderers:
  - `openclaw-config.ts` (505 lines) — Builds JSON config from farm profile, skills, agents, MCP servers
  - `rebuild-config.ts` (285 lines) — Fetches all data and rebuilds config for live instances
  - `soul.ts` — Base SOUL.md template renderer
  - `soul-presets.ts` — Personality renderers for 5 presets (general, grain, weather, scale-tickets, operations) with inter-agent communication guidance
  - `agent-presets.ts` — Suggested multi-agent configurations (2/3/4-agent setups)
  - `onboarding-templates.ts` — Template presets for new instance setup (with tests)
- `validators/` — 15 Zod schema files: `onboarding.ts`, `farm-profile.ts`, `instance.ts`, `agent.ts`, `mcp-server.ts`, `extensibility.ts`, `email.ts`, `admin.ts`, `alerts.ts`, `composio.ts`, `custom-skill.ts`, `knowledge.ts`, `memory.ts`, `openclaw-webhook.ts`, `workflow.ts`
- `security/` — CSRF validation, rate limiting (in-memory + durable + per-user), audit logging, safe error handling, constant-time comparison, redirect validation, data sanitization
- `email/` — Email identity management, AgentMail/Resend providers, inbound processing pipeline, webhook observability and signature verification, idempotency and replay support
- `extensions/` — Trust policy enforcement for extension marketplace
- `queries/` — Admin analytics (fleet health, revenue, usage), customer/instance list queries, extension catalog/rollout queries, workflow definitions
- `infra/` — Instance deprovisioning (Hetzner + Coolify cleanup)
- `connectors/` — Secret management for integrations
- `composio/` — Composio integration client, mock, and toolkit discovery
- `custom-skills/` — Skill sanitization and templates
- `knowledge/` — Document parsing (PDF, DOCX, TXT, Markdown) and payload handling
- `utils/` — Formatters, cost projection, geocoding
- `auth/` — Admin role checking, dashboard session validation
- `crypto.ts` — AES encryption/decryption for secrets (Discord tokens, gateway passwords)
- `channel-token.ts` — Extract Discord token from encrypted channel config

### Database Schema (`supabase/migrations/`)

25 migrations (00001–00025). 45+ tables with RLS. Core tables:
- `customers` — Auth user → billing link, Stripe subscription
- `farm_profiles` — Location, crops, elevators, weather coords, timezone
- `instances` — Container lifecycle, Hetzner/Coolify IDs, channel config
- `agents` — Multi-agent definitions per instance (personality, skills, cron jobs, channel bindings)
- `api_usage` — Daily token metering per model
- `skill_configs` — Per-customer skill toggles and configuration (JSONB)
- `custom_skills` / `custom_skill_versions` — User-created skills with version history
- `tenant_scale_tickets` — Scale ticket delivery records per tenant (replaces per-instance SQLite)
- `grain_bid_cache` — Shared cached grain bids from elevator scrapers
- `mcp_server_configs` — Custom MCP server configs per instance (command, args, env, scope)
- `email_identities` — Email addresses linked to instances
- `email_inbound` / `email_inbound_attachments` — Inbound email processing pipeline
- `email_webhook_events` — Webhook observability
- `extension_catalog_items` / `extension_catalog_versions` — Extension marketplace
- `extension_installations` — Customer extension installs with health status
- `extension_operations` / `extension_operation_targets` — Install/upgrade/rollback operations
- `extension_customer_trust_policies` — Per-customer trust controls
- `extension_update_rollouts` / `extension_update_rollout_targets` — Staged rollout framework
- `upgrade_operations` / `upgrade_instance_logs` — Fleet-wide OpenClaw version upgrades
- `knowledge_files` — Document management per instance/agent
- `memory_vault_settings` / `memory_operations` — Memory vault with compression
- `conversation_events` / `alert_events` / `alert_preferences` — Event tracking and alerts
- `workflow_definitions` / `workflow_versions` — Workflow builder
- `connector_accounts` / `connector_providers` — Composio integration

All RLS policies cascade through `customer_id` linked to `auth.uid()`.

### Components (~80+ files)

- `src/components/ui/` — 11 reusable primitives: button, card, dialog, badge, input, select, switch, tabs, progress, skeleton, toast
- `src/components/landing/` — 10 files: hero, features, pricing, testimonials, channels, CTA, navigation, footer, how-it-works
- `src/components/dashboard/` — 12 files: agent management (card, form, presets picker), status cards, charts, message activity, sidebar/topbar, alerts
- `src/components/onboarding/` — 7 files: 5-step wizard (template selection, farm profile, grain marketing, location, Discord channel), progress, shell layout
- `src/components/settings/` — 25+ files: farm profile, skill management (toggle, forge, AI generator, markdown editor, version history, testing), MCP servers, email identity, knowledge files, custom skills, extensions, memory, spending cap, alert preferences, Composio integration (7 toolkit UI components)
- `src/components/usage/` — 8 files: cost attribution, usage charts, cost comparison, cost-per-conversation, cost ticker
- `src/components/admin/` — 11 files: customer/instance tables, revenue/usage charts, fleet health, spending alerts, upgrade form/progress, subscription breakdown
- `src/components/docs/` — 10 files: navigation, sidebar, TOC, code blocks (shiki syntax highlighting), search, breadcrumbs, callouts

### Types (`src/types/` — 12 files)

`agent.ts`, `alerts.ts`, `billing.ts`, `composio.ts`, `custom-skill.ts`, `database.ts`, `extensibility.ts`, `farm.ts`, `instance.ts`, `knowledge.ts`, `mcp.ts`, `memory.ts`, `workflow.ts`

### Tests (6 files)

- `src/lib/security/constant-time.test.ts` — Secure string comparison
- `src/lib/email/webhook-signature.test.ts` — Email webhook verification
- `src/lib/email/processor-inputs.test.ts` — Email pipeline input validation
- `src/lib/webhooks/openclaw-signature.test.ts` — OpenClaw webhook verification
- `src/lib/utils/cost-projection.test.ts` — Cost calculation
- `src/lib/templates/__tests__/onboarding-templates.test.ts` — Template rendering

### Middleware (`proxy.ts`)

The root `proxy.ts` exports a middleware function that calls `updateSession()` from `src/lib/supabase/middleware.ts`. It runs on all routes except `_next/static`, `_next/image`, `favicon.ico`, `images`, and `api/webhooks`. It handles:
- Supabase auth session refresh
- CSP header injection with nonce
- CSRF origin validation on mutating API calls
- Route protection (redirect unauthenticated users, admin role checks)

### Provisioning Flow

1. User completes 5-step onboarding wizard (Zustand store)
2. POST `/api/instances/provision` (481 lines) validates request, checks subscription
3. Creates Hetzner VPS (cx22, Ubuntu 24.04) with cloud-init
4. Adds server to Coolify, validates Docker installation
5. Builds OpenClaw config + SOUL.md from templates (includes skills, MCP servers, knowledge files)
6. Creates and deploys container via Coolify with base64-encoded configs as env vars
7. `docker/entrypoint.sh` decodes configs to `~/.openclaw/`, injects multi-agent SOUL files, extracts custom skills and knowledge files, sets up Composio connectors, inits scale tickets DB, starts gateway
8. Instance record saved to Supabase with encrypted channel config

### Multi-Agent System

Each instance supports multiple agents with:
- **Personality presets:** General Advisor, Grain Specialist, Weather & Field Ops, Scale Ticket Clerk, Field Operations, Custom
- **Per-agent skills:** Each agent gets a subset of globally-enabled skills
- **Channel bindings:** Agents can be bound to specific Discord channels; default agent handles unbound channels + DMs
- **Cron jobs:** Per-agent scheduled messages (morning weather, daily grain bids)
- **Inter-agent communication:** Agents can delegate via `agents_list` and `sessions_send`
- **Suggested setups:** Pre-built 2/3/4-agent configurations for one-click deployment

### MCP (Model Context Protocol) Servers

Custom MCP server configs stored in `mcp_server_configs` table. Curated presets have been removed — built-in farm tools (scale tickets, grain bids, weather, memory) now use the tenant runtime instead of MCP sidecar servers. Custom MCP servers can still be added for advanced use cases.

### Custom Skills System

- Full CRUD for user-created skills (Markdown-based SKILL.md format)
- AI generation via Claude (generate skill from description)
- Version history with rollback
- Skill testing framework
- Reference file support
- Templates for common skill patterns

### Knowledge Management

- File upload and parsing (PDF via pdf-parse, DOCX via mammoth, TXT, Markdown)
- Shared knowledge (available to all agents) and per-agent knowledge
- Files embedded in container via entrypoint extraction

### Composio Integration

- Toolkit discovery and browsing
- Per-instance connector account management
- Trust disclosure UI (7 dedicated components)
- Mock client for development

### Key Patterns

- **Server Components** by default; `"use client"` only for interactive components (forms, hooks, event handlers)
- **API routes:** authenticate via `supabase.auth.getUser()` → validate with Zod `safeParse` → check authorization → execute → return `NextResponse.json()`
- **Admin client** for privileged DB operations; user client for user-initiated queries (respects RLS)
- **Config rebuild:** All skill, agent, and MCP changes go through `rebuildAndDeploy(instanceId)` which fetches all data, rebuilds config, pushes env vars to Coolify, and restarts the container
- **Lazy loading:** Chart components (`recharts`) loaded via `*-lazy.tsx` wrappers
- **Mock clients:** Coolify and Hetzner both support `mock` mode for local development without real infrastructure

### OpenClaw Skills (`skills/`)

- `farm-grain-bids/` — Scrapes elevator websites via Playwright for cash grain bids
- `farm-weather/` — NWS API integration for forecasts, spray windows, GDD calculations
- `farm-scale-tickets/` — Scale ticket management with three entry methods:
  - Photo OCR (Claude vision extracts fields from ticket images)
  - Voice/unstructured text (NLU parsing of dictated entries)
  - Multi-step structured entry (guided field-by-field input)
  - Data stored in Postgres via tenant runtime tools, configurable visible/required fields
- `farm-alerts/` — Alert management skill

### Extension Marketplace

- Catalog of extensions: skills, plugins, connectors, MCP servers, tool packs
- Source types: local, npm, git, clawhub, internal
- Per-customer trust policies (allowed/verified sources)
- Versioned installations with health monitoring
- Staged rollouts with canary/standard/delayed rings
- Admin controls for fleet-wide operations

### Design System

- **Fonts:** Plus Jakarta Sans (headlines via `--font-headline`), Outfit (body via `--font-sans`)
- **Palette:** Dark theme — deep green-black background (`#0f1209`), warm cream text (`#f0ece4`), amber accent (`#D98C2E`), farm green (`#5a8a3c`)
- **Components:** `src/components/ui/` contains 11 reusable primitives: button, card, dialog, badge, input, select, switch, tabs, progress, skeleton, toast

## Domain Context

- **Target states:** ND, SD, MN, MT, IA, NE (defined in `src/types/farm.ts`)
- **Crops:** Corn, Soybeans, Spring Wheat, Winter Wheat, Durum, Barley, Sunflowers, Canola, Dry Beans, Flax
- **Elevator presets:** CHS, ADM, Cargill, AGP, Columbia Grain, Gavilon — with state-specific defaults and scraping URLs
- **LLM:** OpenRouter (Anthropic Claude Sonnet 4.5) for all customer instances
- **Channel:** Discord (one server per instance, multiple channels via agent bindings)
- **Bushel weights:** Corn 56, Soybeans 60, Wheat 60, Barley 48, Sunflowers 24, Canola 50, Flax 56

## Directory Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup, OAuth callback
│   ├── (dashboard)/     # Dashboard, onboarding, settings (12 sub-pages), usage, alerts
│   ├── (admin)/         # Admin dashboard, customers, instances, upgrades
│   ├── (docs)/          # Built-in documentation site (dynamic MDX routing)
│   ├── api/             # 70 API route handlers
│   └── page.tsx         # Landing page
├── components/
│   ├── ui/              # 11 reusable primitives
│   ├── landing/         # Landing page sections (10 files)
│   ├── dashboard/       # Dashboard components (12 files)
│   ├── onboarding/      # 5-step wizard (7 files)
│   ├── settings/        # Settings panels (25+ files, includes Composio UI)
│   ├── usage/           # Usage analytics (8 files)
│   ├── admin/           # Admin components (11 files)
│   └── docs/            # Documentation components (10 files)
├── hooks/               # use-onboarding (Zustand), use-instance-status
├── lib/                 # Core business logic (see Core Libraries above)
└── types/               # 12 TypeScript interface files

content/docs/            # 44 MDX documentation pages
docker/                  # Dockerfile (OpenClaw 2026.2.9), entrypoint.sh, docker-compose.dev.yml
skills/                  # 4 OpenClaw skill definitions (grain-bids, weather, scale-tickets, alerts)
supabase/migrations/     # 25 PostgreSQL migrations with RLS (45+ tables)
infra/                   # Cloudflare email worker
scripts/                 # Build, email processing, memory processor, migration utilities
templates/               # Static OpenClaw config + SOUL.md templates
docs/                    # 6 operational runbooks (email, extensibility, SLO monitoring)
plans/                   # 5 implementation plans (email, memory vault, visual builder, extensibility)
public/search-index.json # Generated docs search index (prebuild hook)
```
