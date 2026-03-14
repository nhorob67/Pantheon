# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pantheon is an industry-agnostic multi-agent AI platform. Users create a **team** of custom AI agents, each with a defined **role**, **goal**, and **backstory**, bind them to Discord channels, and orchestrate intelligent workflows. The platform handles onboarding, billing ($50/month + metered API usage), custom skill provisioning, and an extension marketplace.

## Current Status

~90% feature-complete. The codebase contains ~330 TypeScript/TSX source files, 70 API routes, 80+ components, 25+ database migrations, and 39 MDX documentation pages.

**What's fully built:** Multi-agent system with role/goal/backstory identity model, 3-step onboarding (team → agent → Discord), email integration (AgentMail + Resend), extension marketplace with trust policies, custom skills with AI generation, knowledge file management, Composio integration, cost management with spending caps, admin fleet dashboard, heartbeat proactive check-ins, built-in documentation site with search.

**What's partially wired:** Workflow visual builder (schema + migrations exist, UI may be partial), advanced upgrade orchestration, memory vault compression operations.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Node native test runner (345 tests across 60+ test files)
```

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router), React 19.2.3, TypeScript 5
- **Styling:** Tailwind CSS 4 with CSS variables (dark theme with bronze accent — see `globals.css`)
- **Auth/DB:** Supabase (PostgreSQL + Auth via magic links + RLS)
- **Payments:** Stripe 20.3.1 (subscriptions + metered usage billing)
- **Hosting:** Vercel (Next.js app), Fly.io (Discord bot)
- **Background Jobs:** Trigger.dev (voice transcription, email, heartbeats)
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
- `src/app/(dashboard)/` — Protected routes: dashboard, agents, onboarding wizard, settings (discord/skills/tools/extensions/email/billing/knowledge/memory/integrations/schedules/workflows), usage analytics.
- `src/app/(admin)/` — Admin dashboard: customers, instances, upgrades, fleet health, revenue, usage analytics, extension rollouts.
- `src/app/(docs)/` — Built-in documentation site with dynamic `[...slug]` routing, sidebar navigation, search, and 39 MDX content pages under `content/docs/`.
- `src/app/api/` — 70 API route handlers for tenant provisioning, management, agents, MCP servers, extensions, email, webhooks, custom skills, knowledge, memory, workflows, Composio, and admin operations.

### API Routes Overview

- **Customer APIs** (~10 routes) — Profile, email identity, alert preferences, spending cap
- **Tenant Management** (~35 routes) — Provisioning, agents CRUD, config updates, skills, MCP servers, knowledge files, memory vault, workflows, Composio connections
- **Custom Skills** (7 routes) — CRUD, AI generation, templates
- **Extensions** (~15 routes) — Catalog, installations, trust policies
- **Admin** (~20 routes) — Customers, tenants, upgrades, analytics (fleet health, revenue, usage), spending alerts, email processing, extension rollouts
- **Webhooks** (4 routes) — Stripe, AgentMail, Resend, tenant runtime events
- **Stripe** — Checkout/portal sessions
- **Health** — Readiness check

### Core Libraries (`src/lib/`)

- `supabase/` — Three client variants: `client.ts` (browser), `server.ts` (server with cookies), `admin.ts` (service role, bypasses RLS). `middleware.ts` handles auth session refresh, CSRF protection, CSP headers, and route guards.
- `stripe/` — `client.ts` (checkout/portal sessions), `config.ts` (price IDs), `webhooks.ts` (event handlers)
- `templates/` — Config builders and system prompt renderers:
  - `agent-soul.ts` — Generic system prompt renderer using role/goal/backstory + autonomy levels + delegation rules
  - `agent-templates.ts` — Starter agent templates (Support Bot, Research Agent, etc.)
  - `soul.ts` — Base SOUL.md template renderer
- `ai/` — AI worker pipeline, system prompt assembly, context assembly, proactive suggestions, session summarization, memory management
- `heartbeat/` — Proactive check-in system: schedule evaluation, cheap checks (unanswered emails, custom checks), signal processing, issue tracking, approval/deferral logic, guardrails
- `runtime/` — Tenant runtime: agent config hydration, tool execution (memory, schedules, self-config), Discord gateway, query/mutation dispatching
- `schedules/` — Schedule template management and predefined schedule sync
- `validators/` — Zod schema files: `onboarding.ts`, `team-profile.ts`, `agent.ts`, `schedule.ts`, `briefing.ts`, `mcp-server.ts`, `extensibility.ts`, `email.ts`, `admin.ts`, `alerts.ts`, `composio.ts`, `custom-skill.ts`, `knowledge.ts`, `memory.ts`, `heartbeat.ts`, `workflow.ts`
- `security/` — CSRF validation, rate limiting (in-memory + durable + per-user), audit logging, safe error handling, constant-time comparison, redirect validation, data sanitization
- `email/` — Email identity management, AgentMail/Resend providers, inbound processing pipeline, webhook observability and signature verification, idempotency and replay support
- `extensions/` — Trust policy enforcement for extension marketplace
- `queries/` — Admin analytics (fleet health, revenue, usage), customer/tenant list queries, extension catalog/rollout queries, workflow definitions
- `connectors/` — Secret management for integrations
- `composio/` — Composio integration client, mock, and toolkit discovery
- `custom-skills/` — Skill sanitization and templates
- `knowledge/` — Document parsing (PDF, DOCX, TXT, Markdown) and payload handling
- `utils/` — Formatters, cost projection, geocoding
- `auth/` — Admin role checking, dashboard session validation
- `crypto.ts` — AES encryption/decryption for secrets (Discord tokens, gateway passwords)

### Database Schema (`supabase/migrations/`)

25+ migrations. 45+ tables with RLS. Core tables:
- `customers` — Auth user → billing link, Stripe subscription
- `team_profiles` — Team name, description, industry (optional), team goal, timezone
- `tenant_agents` — Multi-agent definitions per tenant (role, goal, backstory, autonomy level, skills, channel bindings, schedules)
- `api_usage` — Daily token metering per model
- `custom_skills` / `custom_skill_versions` — User-created skills with version history
- `mcp_server_configs` — Custom MCP server configs per tenant
- `email_identities` — Email addresses linked to tenants
- `email_inbound` / `email_inbound_attachments` — Inbound email processing pipeline
- `email_webhook_events` — Webhook observability
- `extension_catalog_items` / `extension_catalog_versions` — Extension marketplace
- `extension_installations` — Customer extension installs with health status
- `extension_operations` / `extension_operation_targets` — Install/upgrade/rollback operations
- `extension_customer_trust_policies` — Per-customer trust controls
- `extension_update_rollouts` / `extension_update_rollout_targets` — Staged rollout framework
- `knowledge_files` — Document management per tenant/agent
- `memory_vault_settings` / `memory_operations` — Memory vault with compression
- `conversation_events` / `alert_events` / `alert_preferences` — Event tracking and alerts
- `workflow_definitions` / `workflow_versions` — Workflow builder
- `connector_accounts` / `connector_providers` — Composio integration

All RLS policies cascade through `customer_id` linked to `auth.uid()`.

### Components (~80+ files)

- `src/components/ui/` — 11 reusable primitives: button, card, dialog, badge, input, select, switch, tabs, progress, skeleton, toast
- `src/components/landing/` — 10 files: hero, features, pricing, testimonials, channels, CTA, navigation, footer, how-it-works, platform-grid, team-section
- `src/components/dashboard/` — 12 files: agent management (card, form), status cards, charts, message activity, sidebar/topbar, assistants list
- `src/components/onboarding/` — 6 files: 3-step wizard (team setup, first agent, Discord connection), discord server mockup, provisioning progress, shell layout
- `src/components/settings/` — 20+ files: skill management (forge, AI generator, markdown editor, version history, testing), MCP servers, email identity, knowledge files, custom skills, extensions, memory, spending cap, alert preferences, schedule management, heartbeat config, Composio integration
- `src/components/usage/` — 8 files: cost attribution, usage charts, cost comparison, cost-per-conversation, cost ticker
- `src/components/admin/` — 11 files: customer/tenant tables, revenue/usage charts, fleet health, spending alerts, upgrade form/progress, subscription breakdown
- `src/components/docs/` — 10 files: navigation, sidebar, TOC, code blocks (shiki syntax highlighting), search, breadcrumbs, callouts

### Types (`src/types/`)

`agent.ts`, `alerts.ts`, `billing.ts`, `composio.ts`, `custom-skill.ts`, `database.ts`, `extensibility.ts`, `team.ts`, `heartbeat.ts`, `knowledge.ts`, `mcp.ts`, `memory.ts`, `workflow.ts`

### Multi-Agent System

Each tenant supports multiple agents with:
- **Identity:** Role (what the agent is), Goal (what it aims to accomplish), Backstory (personality/constraints) — following the CrewAI pattern
- **Autonomy levels:** Assisted (L1, asks before acting), Copilot (L2, suggests then acts), Autopilot (L3, acts independently)
- **Per-agent skills:** Each agent gets a subset of custom skills
- **Channel bindings:** Agents can be bound to specific Discord channels; default agent handles unbound channels + DMs
- **Schedules:** Per-agent scheduled messages (fully custom, no presets)
- **Delegation:** Agents can delegate tasks to other agents via `agents_list` and `sessions_send`

### MCP (Model Context Protocol) Servers

Custom MCP server configs stored in `mcp_server_configs` table. Users can add custom MCP servers for advanced use cases. Memory and schedule tools are provided via the tenant runtime.

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

### Key Patterns

- **Server Components** by default; `"use client"` only for interactive components (forms, hooks, event handlers)
- **API routes:** authenticate via `supabase.auth.getUser()` → validate with Zod `safeParse` → check authorization → execute → return `NextResponse.json()`
- **Admin client** for privileged DB operations; user client for user-initiated queries (respects RLS)
- **Lazy loading:** Chart components (`recharts`) loaded via `*-lazy.tsx` wrappers

### Extension Marketplace

- Catalog of extensions: skills, plugins, connectors, MCP servers, tool packs
- Source types: local, npm, git, clawhub, internal
- Per-customer trust policies (allowed/verified sources)
- Versioned installations with health monitoring
- Staged rollouts with canary/standard/delayed rings
- Admin controls for fleet-wide operations

### Design System

- **Fonts:** Plus Jakarta Sans (headlines via `--font-headline`), Outfit (body via `--font-sans`)
- **Palette:** Dark theme — warm brown-black background (`#0E0C0A`), cream text (`#EDE6DB`), bronze accent (`#C4883F`), laurel green (`#5E8C61`)
- **Components:** `src/components/ui/` contains 11 reusable primitives

## Key Terminology

- **Team** — The workspace where AI agents live and collaborate (replaces old "farm" concept)
- **Agent** — An AI worker with a defined role, goal, and backstory
- **Role** — What the agent is (e.g., "Customer support specialist")
- **Goal** — What the agent aims to accomplish (e.g., "Resolve tickets quickly")
- **Backstory** — Personality, tone, and constraints
- **Skill** — A custom capability (Markdown-based SKILL.md) that teaches an agent how to handle specific tasks
- **Autonomy Level** — How independently the agent acts: Assisted (L1), Copilot (L2), Autopilot (L3)
- **Schedule** — A user-defined cron-based recurring message/task for an agent
- **Delegation** — Agent-to-agent task handoff

## Directory Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup, OAuth callback
│   ├── (dashboard)/     # Dashboard, agents, onboarding, settings, usage
│   ├── (admin)/         # Admin dashboard, customers, tenants, upgrades
│   ├── (docs)/          # Built-in documentation site (dynamic MDX routing)
│   ├── api/             # 70 API route handlers
│   └── page.tsx         # Landing page
├── components/
│   ├── ui/              # 11 reusable primitives
│   ├── landing/         # Landing page sections
│   ├── dashboard/       # Dashboard components
│   ├── onboarding/      # 3-step wizard (team, agent, Discord)
│   ├── settings/        # Settings panels (includes Composio UI)
│   ├── usage/           # Usage analytics
│   ├── admin/           # Admin components
│   └── docs/            # Documentation components
├── hooks/               # use-onboarding (Zustand), use-knowledge-manager, etc.
├── lib/                 # Core business logic (see Core Libraries above)
└── types/               # TypeScript interface files

bot/                     # Discord bot (deployed on Fly.io)
content/docs/            # 39 MDX documentation pages
supabase/migrations/     # 25+ PostgreSQL migrations with RLS (45+ tables)
scripts/                 # Build, email processing, memory processor, migration utilities
docs/                    # Operational runbooks (email, extensibility, SLO monitoring, runtime)
plans/                   # Implementation plans (industry-agnostic refactoring, etc.)
public/search-index.json # Generated docs search index (prebuild hook)
```

## Deployment

- **Next.js app** → Vercel (auto-deploys from `main` branch)
- **Discord bot** (`bot/`) → Fly.io (see `bot/fly.toml`; shared-cpu-1x, 256MB, auto-start/stop)
- **Database** → Supabase (hosted PostgreSQL + Auth + RLS)
- **Background jobs** → Trigger.dev (voice transcription, email processing, heartbeats)
- **Discord chat messages** are processed inline in the ingress API route (no queue hop)
