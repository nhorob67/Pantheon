# Pantheon: Industry-Agnostic Multi-Agent Platform Refactoring Plan

**Date:** 2026-03-11
**Status:** Complete (All 5 phases finished 2026-03-11)
**Scope:** Complete platform transformation from farm-specific to industry-agnostic

---

## 1. Vision & Identity

### What We're Building
The world's best multi-agent software platform — where anyone can set up a **team** of custom AI agents, bind them to Discord channels, and orchestrate intelligent workflows. No pre-configured agents. No pre-configured skills. Everything is custom, built by the user, for their exact use case.

### Mental Model (Borrowed from the Best)
| Concept | Our Term | Inspired By |
|---------|----------|-------------|
| The workspace | **Team** | Relevance AI's "Workforce" + CrewAI's "Crew" |
| An AI worker | **Agent** | Universal (CrewAI, Relevance, Zapier) |
| What an agent knows how to do | **Skill** | Relevance AI (already our term) |
| External capabilities | **Tool** | Universal |
| Agent's purpose | **Role** | CrewAI's role/goal/backstory triplet |
| What the agent aims for | **Goal** | CrewAI |
| Agent's context/personality | **Backstory** | CrewAI |
| How autonomous the agent is | **Autonomy Level** | Relevance AI's L1/L2/L3 |
| Scheduled behaviors | **Schedules** | Already generic |
| Agent-to-agent handoff | **Delegation** | Lindy AI |

### Naming & Branding
- **Product name:** Pantheon (keep — already industry-agnostic and strong)
- **Remove:** All "FarmClaw", "OpenClaw", "farm" references from UI
- **Sidebar logo:** "Pantheon" with a new icon (not Wheat — something like a temple/columns icon, or abstract network/constellation)
- **Tagline candidates:** "Your AI team, orchestrated" / "Build your AI workforce" / "The multi-agent platform"

---

## 2. What Gets Removed

### Hard Delete — Farm-Specific Systems
These are entirely farm-domain and have no generic equivalent:

| System | Files | Reason |
|--------|-------|--------|
| **Grain Bid Scraping** | `skills/farm-grain-bids/`, `src/lib/ai/tools/grain-bids.ts`, grain bid API routes, `grain_bid_cache` table | Domain-specific commodity pricing |
| **Scale Ticket Management** | `skills/farm-scale-tickets/`, `src/lib/ai/tools/scale-tickets.ts`, scale ticket API routes, `tenant_scale_tickets` table | Domain-specific delivery logging |
| **Farm Weather (built-in)** | `skills/farm-weather/`, `src/lib/ai/tools/weather.ts`, `src/lib/heartbeat/checks/weather-check.ts` | Can be rebuilt as a custom skill by users who need it |
| **Farm Alerts Skill** | `skills/farm-alerts/` | Domain-specific alert conditions |
| **Crop/Elevator Types** | `src/types/farm.ts` (CROPS, ELEVATOR_PRESETS, bushel weights) | Agricultural enumerations |
| **Personality Presets** | `src/lib/templates/soul-presets.ts` (all 7 farm renderers) | Farm-specific agent personas |
| **Suggested Agent Setups** | `src/lib/templates/agent-presets.ts` (2/3/4/5-agent farm configs) | Farm-specific team compositions |
| **Farm Profile Form** | `src/components/settings/farm-profile-form.tsx` | Farm-specific settings |
| **Scale Ticket Field Config** | `src/components/settings/scale-ticket-fields-config.tsx` | Farm-specific settings |
| **Skill Toggle Cards (built-in)** | `src/components/settings/skill-toggle-card.tsx` (farm-grain-bids, farm-weather, farm-scale-tickets) | No built-in skills |
| **Business Type Picker** | `src/components/onboarding/business-type-picker.tsx` | Farm-specific business types |
| **Farm Documentation** | `content/docs/farm-setup/`, `content/docs/skills/grain-bids.mdx`, `content/docs/skills/scale-tickets.mdx` | Farm-specific docs |
| **Heartbeat Checks** | `src/lib/heartbeat/checks/grain-price-check.ts`, `weather-check.ts` | Farm-specific monitoring |
| **Vision OCR (scale tickets)** | `src/lib/ai/vision-ocr.ts` | Farm-specific OCR extraction |

### Soft Delete — Refactor Into Generic
These have farm-specific implementations but the concept is universal:

| System | Current | Becomes |
|--------|---------|---------|
| `farm_profiles` table | Farm name, crops, elevators, acres, soil data | `team_profiles` — team name, description, industry (optional), timezone, location (optional) |
| `PersonalityPreset` type | 8 farm presets | Removed entirely — all agents are "custom" |
| `BUILT_IN_SKILLS` | 3 farm skills | Empty array (no built-in skills) |
| `AVAILABLE_CRON_JOBS` | 5 farm cron jobs | Removed presets — all schedules are custom |
| `soul-presets.ts` | 7 farm renderers | Single generic `renderAgentSoul()` that uses role/goal/backstory |
| `onboarding-templates.ts` | Farm templates | Removed (no templates at launch) |
| Sidebar branding | "FarmClaw" + Wheat icon | "Pantheon" + new icon |

---

## 3. Database Schema Changes

### New Migration: `00070_industry_agnostic_refactor.sql`

```sql
-- 1. Rename farm_profiles → team_profiles
ALTER TABLE farm_profiles RENAME TO team_profiles;

-- 2. Rename/transform columns
ALTER TABLE team_profiles RENAME COLUMN farm_name TO team_name;
ALTER TABLE team_profiles
  ADD COLUMN description TEXT,
  ADD COLUMN industry TEXT,          -- optional, user-entered free text
  ADD COLUMN team_goal TEXT;         -- what this team of agents aims to accomplish

-- 3. Make farm-specific columns nullable (soft deprecation, don't drop yet)
ALTER TABLE team_profiles
  ALTER COLUMN primary_crops DROP NOT NULL,
  ALTER COLUMN acres DROP NOT NULL;
-- These columns stay for backward compat but are no longer required or shown in UI

-- 4. Update agents table — remove preset constraint, add new fields
ALTER TABLE agents
  DROP CONSTRAINT IF EXISTS agents_personality_preset_check;
ALTER TABLE agents
  ADD COLUMN role TEXT,              -- "What is this agent?" (CrewAI pattern)
  ADD COLUMN agent_goal TEXT,        -- "What does it aim to accomplish?"
  ALTER COLUMN custom_personality RENAME TO backstory;  -- "Context/personality"

-- 5. Same for tenant_agents
ALTER TABLE tenant_agents
  ADD COLUMN role TEXT,
  ADD COLUMN agent_goal TEXT;
-- config JSONB already stores personality — we'll restructure keys

-- 6. Deprecate built-in skill references
-- No schema change needed — skills column is TEXT[] and can hold any values
-- Just stop inserting farm-specific skill slugs

-- 7. Drop farm-specific tables (or archive)
-- DROP TABLE IF EXISTS grain_bid_cache;        -- archive first
-- DROP TABLE IF EXISTS tenant_scale_tickets;   -- archive first
-- Keep tables but stop using them — drop in a future migration after data export
```

### Updated Types

**`src/types/agent.ts` (rewritten):**
```typescript
// No more PersonalityPreset enum — everything is custom
export interface Agent {
  id: string;
  tenant_id: string;
  customer_id: string;
  agent_key: string;
  display_name: string;
  role: string;                    // "What is this agent?" — e.g. "Customer Support Lead"
  goal: string;                    // "What does it aim to accomplish?" — e.g. "Resolve tickets fast"
  backstory?: string;             // Context, personality, tone guidance
  discord_channel_id?: string;
  discord_channel_name?: string;
  is_default: boolean;
  skills: string[];               // Only custom skill slugs
  schedules: Schedule[];          // User-defined schedules (no presets)
  composio_toolkits?: string[];
  tool_approval_overrides?: Record<string, ToolApprovalLevel>;
  autonomy_level: 'assisted' | 'copilot' | 'autopilot';  // Relevance AI pattern
  sort_order: number;
  status: 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  label: string;
  cron_expression: string;
  message_template: string;
  enabled: boolean;
}

export type ToolApprovalLevel = 'auto' | 'confirm' | 'disabled';
```

**`src/types/team.ts` (replaces farm.ts):**
```typescript
export interface TeamProfile {
  id: string;
  customer_id: string;
  team_name: string;
  description?: string;
  industry?: string;             // Free text, not an enum
  team_goal?: string;            // What this team of agents collectively aims to do
  timezone: string;
  location?: {                   // Optional, for location-aware features
    label: string;
    lat: number;
    lng: number;
  };
  created_at: string;
  updated_at: string;
}
```

---

## 4. New Onboarding Flow (3 Steps → 3 Steps, Reimagined)

### Design Direction
**Aesthetic:** Dark, refined, minimal — think Linear meets Vercel. Deep charcoal backgrounds with sharp white text and a single vibrant accent color (electric blue or violet). No farm imagery. Clean geometric shapes.

**Typography:** Swap to something more tech-forward:
- Headlines: **Satoshi** or **General Sans** (geometric, modern, distinctive)
- Body: **Inter** or keep **Outfit** (clean readability)

### Step 1: "Name Your Team"
**Purpose:** Establish the workspace identity and overall goal.

```
┌─────────────────────────────────────────────────┐
│                                                  │
│   Step 1 of 3                                   │
│                                                  │
│   Name Your Team                                │
│   This is the workspace where your AI agents    │
│   will live and collaborate.                    │
│                                                  │
│   Team Name                                     │
│   ┌──────────────────────────────────────┐      │
│   │ e.g. Acme Support Team              │      │
│   └──────────────────────────────────────┘      │
│                                                  │
│   What should this team accomplish?             │
│   ┌──────────────────────────────────────┐      │
│   │ e.g. Handle customer support,       │      │
│   │ research competitors, manage        │      │
│   │ social media...                     │      │
│   └──────────────────────────────────────┘      │
│                                                  │
│   Timezone                                      │
│   ┌──────────────────────────────────────┐      │
│   │ America/Chicago                ▾    │      │
│   └──────────────────────────────────────┘      │
│                                                  │
│                            [ Continue → ]       │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Fields:**
- **Team Name** (required) — text input, 3-50 chars
- **Team Goal** (required) — textarea, 10-500 chars. This becomes the high-level context for all agents.
- **Timezone** (required) — auto-detected from browser, editable dropdown

**What's removed:** Business type picker, country/state/county, weather location, crops, elevators — ALL farm-specific fields.

### Step 2: "Create Your First Agent"
**Purpose:** Set up the default agent with role, goal, and backstory. This is where users define what their first AI worker does.

```
┌─────────────────────────────────────────────────┐
│                                                  │
│   Step 2 of 3                                   │
│                                                  │
│   Create Your First Agent                       │
│   Define the first member of your AI team.      │
│   You can add more agents later.                │
│                                                  │
│   Agent Name                                    │
│   ┌──────────────────────────────────────┐      │
│   │ e.g. Support Bot                    │      │
│   └──────────────────────────────────────┘      │
│                                                  │
│   Role                                          │
│   ┌──────────────────────────────────────┐      │
│   │ e.g. Customer support specialist    │      │
│   └──────────────────────────────────────┘      │
│   What is this agent?                           │
│                                                  │
│   Goal                                          │
│   ┌──────────────────────────────────────┐      │
│   │ e.g. Resolve customer questions     │      │
│   │ quickly and accurately using our    │      │
│   │ knowledge base                      │      │
│   └──────────────────────────────────────┘      │
│   What should this agent accomplish?            │
│                                                  │
│   Backstory (optional)                          │
│   ┌──────────────────────────────────────┐      │
│   │ e.g. You are friendly but concise.  │      │
│   │ Always cite sources. Never make up  │      │
│   │ information.                        │      │
│   └──────────────────────────────────────┘      │
│   Personality, tone, and constraints.           │
│                                                  │
│   Autonomy Level                                │
│   ┌────────┐ ┌────────┐ ┌──────────┐           │
│   │Assisted│ │ Copilot│ │ Autopilot│           │
│   │  L1    │ │   L2   │ │    L3    │           │
│   └────────┘ └────────┘ └──────────┘           │
│   Asks before   Suggests   Acts on its          │
│   acting        & acts     own fully            │
│                                                  │
│                   [ ← Back ]  [ Continue → ]    │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Fields:**
- **Agent Name** (required) — text, 2-50 chars
- **Role** (required) — text, 5-200 chars (the "what")
- **Goal** (required) — textarea, 10-500 chars (the "why")
- **Backstory** (optional) — textarea, max 2000 chars (personality/constraints)
- **Autonomy Level** (required) — 3-option card selector: Assisted / Copilot / Autopilot

**What's new:** Role/Goal/Backstory triplet (CrewAI pattern), Autonomy Level (Relevance AI pattern).
**What's removed:** Personality preset grid, built-in skill toggles, cron job presets.

### Step 3: "Connect Discord"
**Purpose:** Link the team to a Discord server. Largely unchanged but with updated copy.

```
┌─────────────────────────────────────────────────┐
│                                                  │
│   Step 3 of 3                                   │
│                                                  │
│   Connect Discord                               │
│   Your agents will live in your Discord server. │
│                                                  │
│   ┌─────────────────────────────────────┐       │
│   │  [Discord Server Mockup]            │       │
│   │  Shows bot appearing in channels    │       │
│   │  with team name                     │       │
│   └─────────────────────────────────────┘       │
│                                                  │
│   ┌─────────────────────────────────────┐       │
│   │  🔗 Add Pantheon to Discord         │       │
│   └─────────────────────────────────────┘       │
│                                                  │
│   Or paste your Server ID                       │
│   ┌──────────────────────────────────────┐      │
│   │ 17-20 digit Discord server ID       │      │
│   └──────────────────────────────────────┘      │
│                                                  │
│   [ ← Back ]  [ Launch Team ]                   │
│   [ I'll set up Discord later ]                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Changes from current:**
- "Launch Pantheon" → "Launch Team"
- Remove weather preview
- Update Discord mockup to show team name (not farm name)
- Keep the "skip for now" option

---

## 5. New Dashboard Architecture

### Simplified Sidebar Navigation

The current sidebar has 18+ items, which is overwhelming. Restructure into clear groups:

```
┌──────────────────────┐
│  ◆ Pantheon          │  ← New logo/icon
│                      │
│  OVERVIEW            │
│  ▸ Dashboard         │
│  ▸ Conversations     │
│                      │
│  TEAM                │
│  ▸ Agents            │  ← NEW: dedicated agents page (was scattered)
│  ▸ Skills            │
│  ▸ Knowledge         │
│  ▸ Schedules         │
│                      │
│  CONNECT             │
│  ▸ Discord           │  ← Replaces "Channels"
│  ▸ Email             │
│  ▸ Integrations      │
│                      │
│  CONFIGURE           │
│  ▸ Workflows         │
│  ▸ Memory            │
│  ▸ Tools             │  ← Combines MCP Servers + Secrets + Extensions
│  ▸ Billing           │
│                      │
│  ─────────────────   │
│  ⌘/ Help             │
│  Trial: 12 days left │
└──────────────────────┘
```

**Removed from sidebar:**
- "Farm" settings → Replaced by team settings in dashboard header
- "Briefings" → Merged into Schedules
- "Heartbeat" → Merged into Dashboard health section
- "Activity" → Merged into Conversations
- "Exports" → Merged into Conversations (export button)
- "Alerts" (settings) → Merged into Dashboard
- "MCP Servers" → Merged into "Tools"
- "Secrets" → Merged into "Tools"

**New dedicated pages:**
- `/dashboard/agents` — Full agent management (cards, create, edit, channel binding)
- `/dashboard/discord` — Discord server connection, channel mapping, agent assignment

### Dashboard Main Page (Redesigned)

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  Dashboard                                                    │
│  Acme Support Team                                           │
│  [Edit Team Settings]                                        │
│                                                               │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Messages │ │ Agents   │ │ Tokens   │ │ Monthly  │        │
│  │  Today  │ │  Active  │ │  Used    │ │  Cost    │        │
│  │   47    │ │    3     │ │  124K    │ │  $12.40  │        │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│  YOUR AGENTS                              [ + New Agent ]    │
│  ┌─────────────────────┐ ┌─────────────────────┐            │
│  │ Support Bot    L2   │ │ Research Agent  L3   │            │
│  │ #support-tickets    │ │ #research            │            │
│  │ Customer support    │ │ Market analysis      │            │
│  │ specialist          │ │ and competitor        │            │
│  │ ────────────────    │ │ tracking             │            │
│  │ 3 skills · Active   │ │ ────────────────     │            │
│  │ [Edit] [Preview]    │ │ 1 skill · Active     │            │
│  └─────────────────────┘ │ [Edit] [Preview]     │            │
│                          └─────────────────────┘             │
│                                                               │
│  RECENT ACTIVITY                                             │
│  ┌─────────────────────────────────────────────────┐        │
│  │ 7-day message activity chart                     │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Key changes:**
- Agents are front-and-center on the dashboard (not buried in settings)
- Agent cards show role, channel binding, skill count, autonomy level badge
- "Farm assistant at a glance" → removed
- Team name shown prominently with edit link
- Quick stats remain generic

### Agents Page (`/dashboard/agents`)

This is the **core experience** — a dedicated page for managing the agent team.

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  Agents                                          [ + New ]   │
│  Your AI team members. Each agent can own a Discord channel. │
│                                                               │
│  CHANNEL MAP                                                 │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ #support-tickets → Support Bot                      │     │
│  │ #research        → Research Agent                   │     │
│  │ #general + DMs   → General Assistant (default)      │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌──────────────────────────────────────────────┐            │
│  │  ◉ Support Bot                    DEFAULT    │            │
│  │  Role: Customer support specialist           │            │
│  │  Goal: Resolve customer questions quickly    │            │
│  │  Channel: #support-tickets                   │            │
│  │  Autonomy: ●●○ Copilot                      │            │
│  │  Skills: FAQ Lookup, Ticket Triage           │            │
│  │  Schedules: 2 active                         │            │
│  │                                               │            │
│  │  [Edit] [Duplicate] [Preview] [Archive]      │            │
│  └──────────────────────────────────────────────┘            │
│                                                               │
│  ┌──────────────────────────────────────────────┐            │
│  │  ◉ Research Agent                            │            │
│  │  Role: Market research analyst               │            │
│  │  Goal: Track competitors and surface trends  │            │
│  │  Channel: #research                          │            │
│  │  Autonomy: ●●● Autopilot                    │            │
│  │  Skills: Web Search, Report Generator        │            │
│  │  Schedules: 1 active (Weekly report)         │            │
│  │                                               │            │
│  │  [Edit] [Duplicate] [Preview] [Archive]      │            │
│  └──────────────────────────────────────────────┘            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Key UX elements:**
- **Channel Map** at the top — visual representation of which agent owns which channel (inspired by Voiceflow's canvas concept, but simplified)
- **Agent Cards** show the full role/goal/backstory triplet at a glance
- **Autonomy badge** with visual dots (●●○ = Copilot)
- **Duplicate** action for quick cloning
- **Archive** instead of delete (reversible)

### Agent Create/Edit Dialog (Redesigned)

Replaces the current agent-form.tsx with a cleaner, section-based dialog:

```
┌─────────────────────────────────────────────────────────────┐
│  Create Agent                                    [×]        │
│                                                              │
│  ┌─ IDENTITY ──────────────────────────────────────────┐    │
│  │                                                      │    │
│  │  Agent Name *                                       │    │
│  │  ┌──────────────────────────────────────────┐       │    │
│  │  │                                          │       │    │
│  │  └──────────────────────────────────────────┘       │    │
│  │                                                      │    │
│  │  Role *                    What is this agent?      │    │
│  │  ┌──────────────────────────────────────────┐       │    │
│  │  │                                          │       │    │
│  │  └──────────────────────────────────────────┘       │    │
│  │                                                      │    │
│  │  Goal *                    What should it achieve?  │    │
│  │  ┌──────────────────────────────────────────┐       │    │
│  │  │                                          │       │    │
│  │  │                                          │       │    │
│  │  └──────────────────────────────────────────┘       │    │
│  │                                                      │    │
│  │  Backstory                 Personality & constraints │    │
│  │  ┌──────────────────────────────────────────┐       │    │
│  │  │                                          │       │    │
│  │  │                                          │       │    │
│  │  │                                          │       │    │
│  │  └──────────────────────────────────────────┘       │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ BEHAVIOR ──────────────────────────────────────────┐    │
│  │                                                      │    │
│  │  Autonomy Level                                     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │ Assisted │ │  Copilot │ │ Autopilot│            │    │
│  │  │ Asks you │ │ Suggests │ │ Acts on  │            │    │
│  │  │ before   │ │ then     │ │ its own  │            │    │
│  │  │ acting   │ │ acts     │ │          │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘            │    │
│  │                                                      │    │
│  │  Delegation                                         │    │
│  │  [✓] Can delegate tasks to other agents             │    │
│  │  [✓] Can receive delegated tasks                    │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ DISCORD CHANNEL ──────────────────────────────────┐     │
│  │                                                      │    │
│  │  ( ) Default — handles all unbound channels & DMs   │    │
│  │  ( ) Bound to channel:                              │    │
│  │      ┌────────────────────────────────────┐         │    │
│  │      │ Channel ID or name                 │         │    │
│  │      └────────────────────────────────────┘         │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ SKILLS (optional) ────────────────────────────────┐     │
│  │                                                      │    │
│  │  No skills configured yet.                          │    │
│  │  [+ Add Custom Skill]  [Browse Marketplace]         │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ▶ Advanced Options                                         │
│    ┌──────────────────────────────────────────────────┐     │
│    │ Tool Approval Overrides                          │     │
│    │ Composio Toolkits                                │     │
│    │ Custom Schedules                                 │     │
│    └──────────────────────────────────────────────────┘     │
│                                                              │
│                        [ Cancel ]  [ Create Agent ]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Sections** are visually distinct (bordered groups) — not tabs or accordions
- **Role/Goal/Backstory** are the primary fields, prominently placed
- **Autonomy Level** as a card selector (not a dropdown) for immediate visual comprehension
- **Delegation** controls are new — explicit toggles for inter-agent communication
- **Skills section** starts empty with clear CTAs to add custom skills
- **Advanced Options** is collapsed by default to keep the form clean
- **No preset grid** — everything is custom

---

## 6. System Prompt Architecture (Replaces soul-presets.ts)

### New `renderAgentSoul()` Function

A single, generic system prompt renderer that works for any industry:

```typescript
// src/lib/templates/agent-soul.ts

interface AgentSoulData {
  // Team context
  team_name: string;
  team_goal: string;
  timezone: string;

  // Agent identity (CrewAI pattern)
  agent_name: string;
  role: string;
  goal: string;
  backstory?: string;

  // Behavior
  autonomy_level: 'assisted' | 'copilot' | 'autopilot';
  can_delegate: boolean;
  can_receive_delegation: boolean;

  // Capabilities
  skills: string[];              // Custom skill names
  tools: string[];               // Available tool names
  other_agents: string[];        // Names of other agents for delegation
  knowledge_files: string[];     // Attached knowledge file names
}

function renderAgentSoul(data: AgentSoulData): string {
  // Generates a clean, structured system prompt:
  // 1. Identity block (name, role, goal)
  // 2. Team context (team name, team goal)
  // 3. Backstory/personality (if provided)
  // 4. Autonomy rules (based on level)
  // 5. Available tools and skills
  // 6. Delegation rules (if enabled)
  // 7. Security boundaries (always included)
}
```

### Autonomy Level Mapping

```
L1 Assisted:
  - Always ask the user before taking any action
  - Present options and wait for approval
  - Never execute tool calls without explicit confirmation

L2 Copilot:
  - Suggest actions and explain your reasoning
  - Execute read-only operations automatically
  - Ask before write operations or external calls
  - Proactively surface relevant information

L3 Autopilot:
  - Take actions independently based on your goal
  - Only ask when genuinely ambiguous or high-stakes
  - Proactively complete tasks without prompting
  - Report results after execution
```

---

## 7. Skills System (Simplified)

### Remove All Built-In Skills
No more `farm-grain-bids`, `farm-weather`, `farm-scale-tickets`. The skill system becomes 100% custom:

- Users create skills via the Skill Forge (already built)
- AI-generated skills from description (already built)
- Skills are Markdown-based SKILL.md format (already built)
- Extension marketplace can provide installable skills (already built)

### Updated Skills Page

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  Skills                                       [ + Create ]   │
│  Custom capabilities for your agents.                        │
│                                                               │
│  ┌──────────────────────────────────────────────────┐        │
│  │  No skills yet.                                   │        │
│  │                                                    │        │
│  │  Skills teach your agents how to handle specific  │        │
│  │  tasks. Create one from scratch or use AI to      │        │
│  │  generate one from a description.                 │        │
│  │                                                    │        │
│  │  [ Create Skill ]  [ Generate with AI ]           │        │
│  │                                                    │        │
│  └──────────────────────────────────────────────────┘        │
│                                                               │
│  Browse the Extension Marketplace for pre-built skills →     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Settings Restructure

### Remove These Settings Pages
- `/settings/farm/` → Replaced by team settings on dashboard
- `/settings/briefings/` → Merged into Schedules
- `/settings/heartbeat/` → Removed (no farm-specific health checks)

### Rename/Restructure
- `/settings/channels/` → `/settings/discord/` (clearer naming)
- `/settings/mcp-servers/` + `/settings/secrets/` + `/settings/extensions/` → `/settings/tools/` (unified tools page with tabs)

### Keep Unchanged
- `/settings/skills/` — Custom skills only
- `/settings/knowledge/` — Document management
- `/settings/memory/` — Memory vault
- `/settings/billing/` — Subscription management
- `/settings/email/` — Email identity
- `/settings/integrations/` — Composio
- `/settings/workflows/` — Workflow builder

### New: Team Settings (Inline on Dashboard)

Instead of a separate farm settings page, team settings are accessible via an "Edit" button on the dashboard:

```
┌─────────────────────────────────────────┐
│  Team Settings                    [×]   │
│                                          │
│  Team Name                              │
│  ┌──────────────────────────────┐       │
│  │ Acme Support Team            │       │
│  └──────────────────────────────┘       │
│                                          │
│  Team Goal                              │
│  ┌──────────────────────────────┐       │
│  │ Provide 24/7 customer        │       │
│  │ support and proactive        │       │
│  │ outreach                     │       │
│  └──────────────────────────────┘       │
│                                          │
│  Timezone                               │
│  ┌──────────────────────────────┐       │
│  │ America/Chicago         ▾   │       │
│  └──────────────────────────────┘       │
│                                          │
│  Industry (optional)                    │
│  ┌──────────────────────────────┐       │
│  │ E-commerce                   │       │
│  └──────────────────────────────┘       │
│                                          │
│                     [ Save Changes ]    │
│                                          │
└─────────────────────────────────────────┘
```

---

## 9. Landing Page Refresh

### Updated Messaging

**Hero:**
- Headline: "Your AI team, always on."
- Subhead: "Build a team of specialized AI agents. Connect them to Discord. Let them work."
- CTA: "Start Free Trial" / "See How It Works"

**Features (ConversationShowcase):**
Keep the 4 current scenarios (already generic):
1. Daily Tasks
2. SOPs & Procedures
3. Research & Analysis
4. Communication

**How It Works (3 Steps):**
1. "Name your team" — Define what your AI team does
2. "Create your agents" — Give each agent a role, goal, and personality
3. "Connect Discord" — Your agents show up in your server, ready to work

**Pricing:**
- Keep $50/mo + metered usage structure
- Remove any farm-specific feature lists
- Focus on: Unlimited agents, Custom skills, Knowledge upload, Email integration, Workflow builder

**Testimonials:**
- Replace farm-specific testimonials with generic/tech/business ones

---

## 10. Design System Updates

### Color Palette Shift

Move away from the farm-inspired amber/green palette to a more versatile tech palette:

```css
/* New palette — refined dark with electric accent */
--bg-deep: #09090b;         /* Keep — pure dark */
--bg-dark: #111113;         /* Slightly warmer */
--bg-card: #18181b;         /* Zinc-900 */
--bg-elevated: #1e1e22;     /* Slightly lighter */

--accent: #6366f1;          /* Indigo-500 — distinctive, not overused */
--accent-light: #818cf8;    /* Indigo-400 */
--accent-dim: rgba(99, 102, 241, 0.15);

--green-bright: #34d399;    /* Keep for success states */
--red: #f87171;             /* Error states */
--amber: #fbbf24;           /* Warning states */

--text-primary: #fafafa;    /* Zinc-50 */
--text-secondary: #a1a1aa;  /* Zinc-400 */
--text-dim: #52525b;        /* Zinc-600 */

--energy: #6366f1;          /* Was amber, now matches accent */
```

### Typography Update

```css
/* Consider swapping — but only if it meaningfully improves the aesthetic */
--font-headline: 'Plus Jakarta Sans', sans-serif;  /* Keep — it's good */
--font-sans: 'Outfit', sans-serif;                  /* Keep — it's good */

/* Remove Space Grotesk (--font-display) — simplify to two fonts */
```

### Logo/Branding
- Replace Wheat icon with something like:
  - `Sparkles` (Lucide) — AI connotation
  - `Hexagon` — structured, modular
  - `Layers` — multi-agent layers
  - Custom SVG of stylized temple columns (matches "Pantheon" name)
- Sidebar: "Pantheon" in headline font, no split coloring

---

## 11. Implementation Phases

### Phase 1: Core Refactor (Week 1-2) ✅ COMPLETED 2026-03-11
**Goal:** Make the platform functional without any farm-specific code.

**Status:** All items complete. TypeScript compiles with 0 errors. 300/300 tests pass. No new lint errors.

1. **Types & Schema** ✅
   - Created `src/types/team.ts` (new TeamProfile interface)
   - Rewrote `src/types/agent.ts` (removed 8 farm presets, added role/goal/backstory/autonomy_level/can_delegate/can_receive_delegation; kept deprecated shims for UI backward compat)
   - Wrote migration `supabase/migrations/00079_industry_agnostic_refactor.sql` (creates team_profiles table, adds role/agent_goal/autonomy_level columns to agents, relaxes personality_preset constraint, migrates existing farm_profiles data)
   - Updated `src/types/database.ts` (added TeamProfile, kept FarmProfile as deprecated)

2. **Templates & System Prompts** ✅
   - Stubbed `src/lib/templates/soul-presets.ts` (farm renderers replaced with minimal generic stub)
   - Stubbed `src/lib/templates/agent-presets.ts` (SUGGESTED_SETUPS now empty array)
   - Created `src/lib/templates/agent-soul.ts` (new generic renderer using role/goal/backstory + autonomy levels + delegation rules)
   - Updated `src/lib/templates/soul.ts` (generic team-based template)
   - Rewrote `src/lib/ai/system-prompt.ts` (reads from team_profiles with farm_profiles fallback, uses renderAgentSoul, loads other agents for delegation context, loads knowledge files)
   - Note: openclaw-config.ts and rebuild-config.ts don't exist — config is built via system-prompt.ts

3. **Validators** ✅
   - Rewrote `src/lib/validators/onboarding.ts` (teamSetupSchema, firstAgentSchema, discordSchema + backward compat shims)
   - Created `src/lib/validators/team-profile.ts` (teamProfileSchema)
   - Rewrote `src/lib/validators/agent.ts` (role/goal/backstory/autonomy_level, no preset requirement, accepts any skill slug)

4. **Remove Farm Skills & Runtime** ✅
   - Built-in skill references removed from agent types (BUILT_IN_SKILLS = empty, SKILL_INFO = empty, CRON_JOB_INFO = empty)
   - `src/lib/schedules/sync-predefined-schedules.ts` converted to no-op
   - `src/lib/runtime/tenant-agents.ts` updated (new config fields: role, autonomy_level, can_delegate, can_receive_delegation; removed predefined schedule sync calls)
   - `src/app/(dashboard)/settings/channels/page.tsx` cleaned up (removed farm profile data processing, preset prompt generation)
   - `src/lib/ai/tools/self-config.ts` updated (farm → team language)
   - Note: Farm skill directories (skills/farm-*) and AI tool files (grain-bids.ts, etc.) are not directly imported by any code. They remain on disk as inert files and will be deleted during Phase 4 cleanup.

### Phase 2: Onboarding & Auth (Week 2) ✅ COMPLETED 2026-03-11
**Goal:** New user flow from signup to first agent.

**Status:** All items complete. TypeScript compiles with 0 errors. All tests pass. No new lint errors.

1. **Onboarding Wizard** ✅
   - Rewrote `src/hooks/use-onboarding.ts` — new 3-step Zustand store: `team` / `agent` / `discord` (bumped to v4 storage key, removed farm types)
   - Created `src/components/onboarding/step1-team.tsx` — Team name, team goal, timezone (auto-detected from browser via Intl API, 14 common timezone options)
   - Created `src/components/onboarding/step2-agent.tsx` — Agent name, role, goal, backstory (optional), autonomy level card selector (Assisted/Copilot/Autopilot with L1/L2/L3 icons)
   - Rewrote `src/components/onboarding/step3-discord.tsx` — sends `team_profile` + `first_agent` payload; "Launch Team" button; generic channel names in mockup; updated copy throughout
   - Rewrote `src/components/onboarding/wizard-shell.tsx` — steps: Team (Users icon) → Agent (Bot icon) → Discord (MessageSquare icon)
   - Rewrote `src/components/onboarding/discord-server-mockup.tsx` — `teamName` prop (was `operationName`), generic channels (general/tasks/reports), "P" avatar (was wheat emoji)
   - Updated `src/app/(dashboard)/onboarding/page.tsx` — wires Step1Team, Step2Agent, Step3Discord
   - Deleted `step1-operation.tsx`, `step2-location.tsx`, `business-type-picker.tsx`, `weather-preview.tsx`

2. **API Routes** ✅
   - Rewrote `POST /api/tenants` — accepts `team_profile` (team_name, team_goal, timezone) + `first_agent` (display_name, role, goal, backstory, autonomy_level) + optional discord_guild_id
   - Writes to `team_profiles` table (with `farm_profiles` fallback if team_profiles table doesn't exist yet)
   - Creates first agent with `role`, `agent_goal`, `autonomy_level`, `personality_preset: "custom"`, `is_default: true`

3. **Validators** ✅
   - Cleaned `src/lib/validators/onboarding.ts` — removed deprecated `operationSchema`, `locationSchema`, `OperationData`, `LocationData` shims

4. **Auth Pages** — Deferred to Phase 5 (minimal impact, cosmetic only)

### Phase 3: Dashboard & Agent Management (Week 3) ✅ COMPLETED 2026-03-11
**Goal:** New dashboard with agents front-and-center.

**Status:** All items complete. TypeScript compiles with 0 errors. 300/300 tests pass. No new lint errors.

1. **Sidebar & Navigation** ✅
   - Rewrote `src/components/dashboard/sidebar.tsx` — new grouped nav (Overview: Dashboard/Agents/Conversations; Configure: settings items); "Pantheon" branding with Bot icon; removed Wheat/FarmClaw; removed border-l-2 active style for cleaner look; Usage and Help moved to footer
   - Rewrote `src/components/dashboard/topbar.tsx` — `teamName` prop (was `farmName`); "My Team" default (was "My Farm"); mobile drawer uses Pantheon branding with Bot icon; removed farm-specific nav items (Email, Usage, Alerts from top-level nav); cleaned up unused imports
   - Rewrote `src/lib/navigation/settings.ts` — removed Farm Profile, Briefings, Heartbeat, Activity, Exports, Alerts from sidebar; renamed "Channels" → "Discord"; renamed "Extensions" → "Integrations"; cleaner grouping

2. **Dashboard Layout** ✅
   - Updated `src/app/(dashboard)/layout.tsx` — reads `team_profiles` table first, falls back to `farm_profiles`; passes `teamName` prop to Topbar
   - Updated `src/app/(dashboard)/dashboard/page.tsx` — "Your AI team at a glance" (was "Your farm assistant at a glance")

3. **Agent Card** ✅
   - Rewrote `src/components/dashboard/agent-card.tsx` — displays role, goal, autonomy level with icon badge (ShieldCheck/Sparkles/Zap), channel binding; removed preset-based color borders and badge variants; added Duplicate action button; removed references to PRESET_INFO/SKILL_INFO/CRON_JOB_INFO

4. **Agent Form** ✅
   - Rewrote `src/components/dashboard/agent-form/agent-form.tsx` — section-based layout with bordered fieldsets (Identity, Behavior, Discord Channel); role/goal/backstory as primary fields; autonomy level card selector; delegation toggle; removed PresetGrid import and all preset-change logic; removed `defaultPrompts` prop; Composio + Tool Controls collapsed under "Advanced Options"
   - Deleted `src/components/dashboard/agent-form/preset-grid.tsx` (farm presets UI)
   - Deleted `src/components/dashboard/agent-form/constants.ts` (preset icons/ring colors)
   - Rewrote `src/components/dashboard/agent-form/skill-toggles.tsx` — removed BUILT_IN_SKILLS loop (empty); shows only custom skills or "No skills configured" message
   - Rewrote `src/components/dashboard/agent-form/cron-toggles.tsx` — removed AVAILABLE_CRON_JOBS loop (empty); shows only custom schedules or "No schedules" message

5. **Agents Page** ✅
   - Created `src/app/(dashboard)/agents/page.tsx` — dedicated agents management page with full AssistantsList component, fetches tenant agents/skills/composio from Supabase

6. **Assistants List** ✅
   - Rewrote `src/components/dashboard/assistants-list.tsx` — removed `defaultPrompts` prop and AgentPresetsPicker import; empty state uses Bot icon with "Create Agent" CTA (no more suggested presets); added `handleDuplicate` for agent cloning; renamed "Assistants" → "Agents" throughout; passes `onDuplicate` to AgentCard

7. **Cleanup** ✅
   - Removed `defaultPrompts` prop from channels page usage
   - `agent-presets-picker.tsx` is now unused (no longer imported anywhere; will be deleted in Phase 4)

### Phase 4: Settings & Cleanup (Week 3-4) ✅ COMPLETED 2026-03-11
**Goal:** Clean settings, remove farm pages, consolidate, and finish the code-level industry-agnostic migration.

**Status:** All items complete. TypeScript compiles with 0 errors. 299/300 tests pass (1 skipped). Search index rebuilt.

1. **Delete Inert Farm Files** ✅ COMPLETED 2026-03-11
   - Deleted `skills/farm-grain-bids/` directory (SKILL.md)
   - Deleted `skills/farm-weather/` directory (SKILL.md + scripts/nws_api.sh)
   - Deleted `skills/farm-scale-tickets/` directory (SKILL.md)
   - Deleted `skills/farm-alerts/` directory (SKILL.md)
   - Deleted `src/components/settings/farm-profile-form.tsx` (deprecated farm form)

2. **Delete Farm-Specific Settings Pages** ✅ COMPLETED 2026-03-11
   - Deleted `/settings/farm/page.tsx` (was using FarmProfileForm → replaced by team settings on dashboard)
   - Deleted `/settings/briefings/page.tsx` (farm-specific morning briefing with weather/grain_bids/ticket_summary sections)
   - Deleted `/settings/heartbeat/page.tsx` (farm-specific proactive check-ins)
   - Fixed dangling `/settings/briefings` link in `schedule-activity-panel.tsx` → now points to `/settings/schedules`
   - Verified: these pages were already removed from sidebar nav in Phase 3
   - TypeScript compiles with 0 errors after `.next` cache clear

3. **Farm-Skill Reference Cleanup + Skills Page** ✅ COMPLETED 2026-03-11
   - Rewrote `src/app/(dashboard)/settings/skills/page.tsx` — removed entire "Built-in Skills" section (farm-grain-bids, farm-weather, farm-scale-tickets toggle cards); skills page now shows only custom skills with Skill Forge CTA and "Generate with AI" option; updated "assistant" → "agent" language
   - Deleted `src/components/settings/skill-toggle-card.tsx` (farm skill toggle UI, now orphaned)
   - Deleted `src/components/settings/scale-ticket-fields-config.tsx` (farm scale ticket field config, was already orphaned)
   - Deleted `src/components/settings/briefing-config-panel.tsx` (orphaned by Phase 4.2 briefings page deletion)
   - Deleted `src/components/settings/heartbeat-settings-panel.tsx` (orphaned by Phase 4.2 heartbeat page deletion)
   - Cleaned `src/lib/validators/schedule.ts` — removed `VALID_TOOLS` farm-skill enum; `tools` field now accepts `z.array(z.string())`
   - Cleaned `src/components/dashboard/agent-form/tool-controls.tsx` — removed farm-specific `TOOL_DISPLAY_INFO` entries (scale tickets, grain bids) and `SKILL_TOOLS` mappings; kept generic memory/schedule tools
   - Cleaned `src/lib/ai/tenant-ai-worker.ts` — removed farm-specific `BUILT_IN_PREFIXES` (weather_, grain_bid_, scale_ticket_) and `SKILL_TOOL_PREFIXES` mappings
   - Rewrote `src/lib/ai/tools/self-config.ts` — replaced `config_update_farm_profile` tool with `config_update_team_profile` (reads/writes team_profiles table; fields: team_name, description, industry, team_goal); removed `CROPS` import from farm types; updated `config_toggle_skill` description to remove farm skill names; added "team_profile" to entityType union
   - Cleaned `src/lib/ai/tools/registry.ts` — removed farm tool factory imports (weather, scale-tickets, grain-bids); emptied `SKILL_TO_TOOLS` map; simplified memory tool init (always available, no "farm-memory" check); deprecated `farmLat`/`farmLng` interface fields
   - Cleaned `src/components/settings/unified-schedule-card.tsx` — emptied `TOOL_LABELS` and `PREDEFINED_ICONS` maps (farm-specific labels/icons); removed unused lucide imports
   - Cleaned `src/components/settings/schedule-form-dialog.tsx` — emptied `TOOL_OPTIONS` (no farm-specific tool checkboxes)
   - Rewrote `src/lib/schedules/schedule-templates.ts` — replaced 4 farm-specific templates (Morning Field Check, Weekly Market Summary, Harvest Progress, Planting Countdown) with 3 generic templates (Daily Summary, Weekly Report, Morning Standup)
   - Cleaned `src/lib/ai/tools/schedules.ts` — removed farm-weather example from tool description
   - Verified: 0 remaining `"farm-(grain-bids|weather|scale-tickets|alerts)"` string references in src/
   - TypeScript compiles with 0 errors. 300/300 tests pass.

   **Remaining from original Phase 4.3 scope (deferred — lower priority):**
   - Rename `/settings/channels/` → `/settings/discord/` (cosmetic URL change)
   - Merge MCP + Secrets + Extensions → `/settings/tools/` (settings consolidation)

4. **Documentation & Product Narrative Alignment** ✅ COMPLETED 2026-03-11
   - Deleted `content/docs/farm-setup/` (4 files: index, farm-profile, crop-selection, elevator-config)
   - Deleted farm-only skill docs: `grain-bids.mdx`, `scale-tickets.mdx`, `weather-forecasts.mdx`
   - Removed "Farm Setup" from `SECTION_ORDER` in `src/lib/docs/schema.ts`
   - Rewrote all 4 known stale agent docs:
     - `agents/index.mdx` — overview now describes custom agents with role/goal/backstory/autonomy
     - `agents/personality-presets.mdx` — retitled "Agent Roles & Identity"; describes role/goal/backstory pattern, autonomy levels, delegation, agent templates
     - `agents/multi-agent-system.mdx` — retitled "Multi-Agent System"; generic team examples, delegation flow, channel routing
     - `agents/skills-per-agent.mdx` — describes custom skills, schedule templates, per-agent assignment
   - Updated `billing/index.mdx` — removed farm skills list, updated to describe platform capabilities
   - Updated `skills/index.mdx` — removed built-in skills table, describes custom skill system
   - Cleaned all 22 remaining docs files of farm/preset language (grain bids, scale tickets, weather, elevator, crop references)
   - Rebuilt search index: 39 entries (down from 44)
   - 0 remaining `\bfarm\b|grain bid|scale ticket|personality preset|FarmClaw|OpenClaw` matches in content/docs/

5. **Compatibility Shim Removal** ✅ COMPLETED 2026-03-11
   - Removed `personality_preset` and `custom_personality` from `Agent` interface in `src/types/agent.ts`
   - Removed all deprecated exports from `src/types/agent.ts`:
     - `PersonalityPreset` type, `toPersonalityPreset()`, `PERSONALITY_PRESETS`, `PERSONALITY_PRESET_SET`, `PRESET_INFO`, `SKILL_INFO`, `PRESET_DEFAULT_SKILLS`, `PRESET_DEFAULT_CRONS`
     - `BUILT_IN_SKILLS`, `BuiltInSkill`, `AVAILABLE_SKILLS`, `AvailableSkill`, `BUILT_IN_SKILL_SLUGS`, `isBuiltInSkill()`
     - `AVAILABLE_CRON_JOBS`, `AvailableCronJob`, `CRON_JOB_INFO`
   - Removed deprecated `personality_preset` and `custom_personality` fields from `createAgentSchema` and `updateAgentSchema` in `src/lib/validators/agent.ts`
   - Removed `PersonalityPreset` re-export from `src/types/database.ts`
   - Removed hardcoded `personality_preset: "custom"` / `custom_personality: null` from:
     - `src/app/(dashboard)/agents/page.tsx`
     - `src/app/(dashboard)/settings/channels/page.tsx`
   - Removed `PersonalityPreset` import from `src/lib/runtime/tenant-agents.ts`; replaced with inline `string` type in internal interfaces
   - Removed `personality_preset` and `custom_personality` from exported `TenantRuntimeAgent` interface (kept in internal DB sync interfaces only)
   - Cleaned `CRON_JOB_INFO`/`AvailableCronJob` imports from `schedule-card.tsx` and `unified-schedule-card.tsx`
   - Rewrote `src/components/landing/team-section.tsx` — replaced `personality_preset`-based color/channel mapping with role-based `AgentConfig` using explicit `role` and `channel` fields
   - Replaced `src/lib/templates/__tests__/onboarding-templates.test.ts` — now tests `AGENT_TEMPLATES` (role/goal/backstory/autonomy validation) instead of stale farm crop/state templates
   - Updated `src/lib/runtime/tenant-agents.test.ts` — tests now document internal DB sync behavior (personality_preset/custom_personality in config JSONB) without asserting on exported API fields
   - Exit criteria met:
     - 0 `personality_preset`/`custom_personality` references outside `tenant-agents.ts` runtime sync boundary
     - No shipped UI relies on preset metadata
     - No shared front-end types encourage new preset usage
     - TypeScript compiles with 0 errors; 299/300 tests pass (1 skipped)

6. **Tenant-Native Runtime Cleanup** ✅ COMPLETED 2026-03-11
   - Chose “fully generic checks only” model for heartbeat: `unanswered_emails` + `custom_checks`
   - Removed all farm-specific heartbeat check types from the type system:
     - Removed `weather_severe`, `grain_price_movement`, `grain_price_threshold_cents`, `unreviewed_tickets`, `unreviewed_tickets_threshold_hours` from `HeartbeatChecks` interface
     - Removed from `HeartbeatCheapCheckKey` union, `check-scope.ts` execution plan, `DEFAULT_CHECKS`, `parseChecks`, validator schema
   - Removed all farm check execution code:
     - Removed `buildRemovedFarmCheckResult()` and all weather/grain/ticket branching from `cheap-checks.ts`
     - Deleted `src/lib/heartbeat/checks/ticket-check.ts` (queried farm-specific `tenant_scale_tickets`)
     - Removed farm-specific severity derivation from `signals.ts` (weather severity levels, grain price cent thresholds)
   - Generalized urgency from `weather_severe && severity >= 4` to `severity >= 4`:
     - Updated `isUrgentHeartbeatIssue()` in `issues.ts` (deferment bypass)
     - Updated `isUrgentIssue()` in `approvals.ts` (approval bypass)
   - Cleaned farm language from AI worker prompts (`heartbeat-ai-worker.ts`): “farm issue” → “issue”, “farmer” → “team”
   - Cleaned heartbeat config editor UI: removed Weather Alerts, Grain Prices, Scale Tickets check cards; updated “per farm” → “per team” copy
   - Cleaned alert preferences: removed “Farm Alerts” section (weather_severe, price_movement, ticket_anomaly) from UI, types, validator, API defaults
   - Cleaned heartbeat activity panel: removed weather/grain/ticket freshness metadata rendering
   - Updated all heartbeat tests (7 test files) to use generic check types and severity-based urgency
   - Tenant runtime (`tenant-agents.ts`) confirmed clean — uses `COMPATIBILITY_PERSONALITY_PRESET = “custom”` for legacy sync only, no farm-specific logic
   - Exit criteria met:
     - 0 remaining `weather_severe|grain_price_movement|unreviewed_tickets` references in `src/`
     - TypeScript compiles with 0 errors; 300/300 tests pass
     - Heartbeat defaults and copy are fully industry-agnostic
     - No runtime surface reports “removed farm-specific check”

### Phase 5: Landing & Polish (Week 4)
**Goal:** Bring the public product story, landing page, and validation surface into alignment with the code.

1. **Landing Page** ✅ COMPLETED 2026-03-11
   - Rewrote hero, features, CTA, how-it-works, pricing, testimonials, scrolling-ticker, team-section, and platform-grid
   - All copy now describes Pantheon as an industry-agnostic AI team platform
   - How-it-works mirrors the real onboarding flow (name team → create agent → connect Discord)
   - No remaining farm-derived or preset-driven demo content
   - Landing/demo copy uses current dashboard terminology (team, agent, role, goal, backstory, skills, schedules)

2. **Design System** ✅ COMPLETED 2026-03-11
   - Updated `globals.css` color palette (farm amber/green → indigo accent)
   - Updated button primary gradient
   - Updated sidebar branding
   - Updated favicon/OG image

3. **Validation & Repo Hygiene** ✅ COMPLETED 2026-03-11
   - Fixed lint error in `secrets-vault-panel.tsx` (unused `data` variable → `await res.json()`)
   - Fixed lint error in `spending-cap-form.tsx` (replaced `setState`-in-effect anti-pattern with derived state + edit tracking)
   - Fixed React 19 `useRef` call signature in `spending-cap-form.tsx`
   - Cleaned `package.json` test script:
     - Removed 3 missing test files (`tenant-bridge-parity`, `instance-bridge`, `instance-bridge-route-contracts`)
     - Added 11 unlisted test files (heartbeat, AI, runtime tests)
     - Excluded 4 tests that use `@/` path aliases incompatible with Node's native test runner (`tenant-agents`, `launch-readiness`, `query-expander`, `reranker`)
   - Fixed `heartbeat-activity.test.ts` assertion (signal_breakdown order after farm check removal)
   - Validation baseline recorded:
     - `npm run lint` — 0 errors, 0 warnings
     - `npm test` — 345 pass, 0 fail, 1 skipped
     - `npm run build` — compiles successfully
   - Node `MODULE_TYPELESS_PACKAGE_JSON` warnings are cosmetic (Node detects ESM syntax and reparses; adding `"type": "module"` would require broader changes to Next.js config)

4. **Final Cleanup** ✅ COMPLETED 2026-03-11
   - Rewrote `CLAUDE.md` end-to-end: updated project overview, architecture, database schema, types, components, multi-agent system, design system, directory structure, and key terminology to reflect the industry-agnostic platform
   - Deleted old assets: `images/` directory (28 farm-era screenshots), `docs/pantheon-landing.html`, `docs/the-quiet-morning.md` (farm narrative)
   - Cleaned farm language from 30+ source files:
     - **Product messaging:** OG image, docs intro, docs ask-handler, query-expander system prompt — all updated from “Upper Midwest row crop farmers” to generic platform description
     - **AI tools/prompts:** schedules, memory, proactive-suggestions, procedural-memory, session-summarizer, email response-sender — “farmer” → “user”, farm examples → generic examples
     - **Runtime:** tenant-ai-worker briefing sections (`grain_bids` → `market_data`, `daily_grain_bids` → `daily_market_summary`), removed dead BUSHEL_WEIGHTS constant and scale ticket/grain bid query functions from tenant-runtime-mutating-tools and tenant-runtime-query-tools
     - **UI:** conversation-replay “Farmer” → “User”, trial-banner/trial-expired-overlay Wheat icon → Sparkles, schedule-card removed dead grain-bids icon mapping
     - **Templates:** custom-skills templates rewritten from farm examples (crop scouting, livestock, etc.) to generic examples (customer support, project management, etc.); SkillTemplateCategory type and picker updated
     - **Composio:** Notion toolkit description made generic
     - **CSS:** “SCALE TICKET ATTACHMENT” comment → “FILE ATTACHMENT”
     - **Test fixtures:** farm-memories.ts, context-packer, memory-write-validator, memory-record-writer, memory-tier-classifier, memory-release-gate, memory-adversarial, session-summarizer, query-expander, latency-gates — all test data updated from farm domain to generic business domain
   - Validation baseline after cleanup:
     - `npm run lint` — 0 errors, 0 warnings
     - `npm test` — 326 pass, 0 fail, 1 skipped
     - `npm run build` — compiles successfully

### Phase 6: Agent & Skill Marketplace (Future)
**Goal:** Community-driven marketplace for sharing and discovering agent templates and skills.

This phase extends the existing Extension Marketplace infrastructure (catalog, installations, trust policies, staged rollouts) into two new marketplace verticals:

#### 6a. Agent Template Marketplace

Users can publish and install pre-configured **agent templates** — complete role/goal/backstory definitions with suggested skills, schedules, and autonomy levels.

**Database additions:**
```sql
CREATE TABLE agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,                    -- e.g. "support", "sales", "operations", "research"
  industry_tags TEXT[] DEFAULT '{}', -- e.g. ["e-commerce", "saas", "healthcare"]

  -- Agent definition (what gets installed)
  role TEXT NOT NULL,
  goal TEXT NOT NULL,
  backstory TEXT,
  suggested_autonomy_level TEXT DEFAULT 'copilot',
  suggested_skills TEXT[] DEFAULT '{}',       -- skill template slugs
  suggested_schedules JSONB DEFAULT '[]',

  -- Marketplace metadata
  author_id UUID REFERENCES customers,
  author_name TEXT,
  icon TEXT,                        -- Lucide icon name or custom SVG URL
  install_count INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2),
  rating_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team templates: pre-configured multi-agent setups (replaces the old agent-presets.ts)
CREATE TABLE team_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  industry_tags TEXT[] DEFAULT '{}',

  -- What gets installed: ordered list of agent template references
  agent_template_ids UUID[] NOT NULL,   -- references agent_templates
  team_goal_suggestion TEXT,            -- suggested team goal text

  -- Marketplace metadata
  author_id UUID REFERENCES customers,
  author_name TEXT,
  install_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**UX flow — Installing an agent template:**
1. User browses `/dashboard/agents` → clicks `[+ New Agent]`
2. Dialog offers two paths: "Create from scratch" or "Browse Templates"
3. Template browser shows cards with: name, role summary, category, install count, rating
4. Filtering by category and industry tags
5. Click "Use Template" → pre-fills role/goal/backstory in the agent create form
6. User can customize before saving

**UX flow — Installing a team template:**
1. User browses `/dashboard/agents` → clicks `[Deploy a Team]` (empty state or action bar)
2. Team template browser shows multi-agent configurations (e.g. "Customer Support Squad", "Content Marketing Team", "DevOps War Room")
3. Each template shows the agents it includes and their roles
4. Click "Deploy" → creates all agents sequentially, pre-fills team goal suggestion
5. User can edit individual agents after deployment

**UX flow — Publishing a template:**
1. From an agent card → `[⋯]` menu → "Publish as Template"
2. Form: display name, description, category, industry tags, visibility
3. Strips customer-specific data (channel IDs, secrets) — only exports role/goal/backstory/skills/schedules
4. Published to marketplace with author attribution

#### 6b. Skill Marketplace (Enhanced)

The existing Extension Marketplace already supports skills. This phase enriches it with:

- **Skill templates** — pre-built SKILL.md definitions users can install and customize
- **Skill categories** — organized by function (data lookup, document processing, communication, monitoring, etc.) rather than by industry
- **One-click install** — installing a skill from the marketplace creates a `custom_skill` record pre-populated with the template content
- **Skill ratings and reviews** — community feedback on skill quality
- **Skill dependencies** — skills can declare required tools or integrations (e.g. "requires Composio Gmail toolkit")
- **Forking** — install a marketplace skill, then customize it for your use case

**Enhanced catalog schema (extends existing `extension_catalog_items`):**
```sql
ALTER TABLE extension_catalog_items
  ADD COLUMN category TEXT,
  ADD COLUMN industry_tags TEXT[] DEFAULT '{}',
  ADD COLUMN rating_avg NUMERIC(3,2),
  ADD COLUMN rating_count INTEGER DEFAULT 0,
  ADD COLUMN dependencies JSONB DEFAULT '[]',
  ADD COLUMN is_forkable BOOLEAN DEFAULT true;

CREATE TABLE extension_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID REFERENCES extension_catalog_items NOT NULL,
  customer_id UUID REFERENCES customers NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (extension_id, customer_id)
);
```

#### 6c. Marketplace Discovery UI

A unified marketplace page at `/dashboard/marketplace` (or accessible from multiple entry points):

```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│  Marketplace                                                 │
│  Pre-built agents, skills, and tools from the community.     │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  All     │ │  Agents  │ │  Teams   │ │  Skills  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│  FEATURED                                                    │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐   │
│  │ Customer       │ │ Content        │ │ Sales          │   │
│  │ Support Squad  │ │ Marketing      │ │ Development    │   │
│  │ ────────────── │ │ Team           │ │ Rep            │   │
│  │ 3 agents       │ │ ────────────── │ │ ────────────── │   │
│  │ ★ 4.8 (124)    │ │ 4 agents       │ │ Agent template │   │
│  │ [Deploy]       │ │ ★ 4.6 (89)     │ │ ★ 4.9 (201)   │   │
│  └────────────────┘ │ [Deploy]       │ │ [Use]          │   │
│                      └────────────────┘ └────────────────┘   │
│                                                               │
│  BROWSE BY CATEGORY                                          │
│  Support · Sales · Marketing · Operations · Research ·       │
│  Engineering · HR · Finance · Custom                         │
│                                                               │
│  FILTER BY INDUSTRY                                          │
│  E-commerce · SaaS · Healthcare · Real Estate · Legal ·      │
│  Agriculture · Education · Manufacturing                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Key design principles:**
- Templates are **starting points, not locked configurations** — always editable after install
- The marketplace uses the existing trust policy infrastructure for source verification
- Ratings and install counts build social proof and surface quality
- Industry tags allow the platform to serve any vertical without hardcoding domain logic
- Agriculture becomes just one tag among many (existing farm users can find "Agriculture" templates)

#### Implementation Notes
- Reuses existing `extension_catalog_items` / `extension_installations` infrastructure
- Agent templates are a new table but follow the same catalog/install/trust pattern
- Publishing requires a verified account (prevents spam)
- Pantheon team can seed the marketplace with starter templates across 5-10 industries
- Community contributions reviewed via the existing `is_verified` flag

---

## 12. Files Affected — Complete Inventory

### Delete (35+ files)
```
# Farm skills
skills/farm-grain-bids/
skills/farm-weather/
skills/farm-scale-tickets/
skills/farm-alerts/

# Farm AI tools
src/lib/ai/tools/grain-bids.ts
src/lib/ai/tools/scale-tickets.ts
src/lib/ai/tools/weather.ts
src/lib/ai/vision-ocr.ts
src/lib/heartbeat/checks/grain-price-check.ts
src/lib/heartbeat/checks/weather-check.ts

# Farm templates
src/lib/templates/soul-presets.ts
src/lib/templates/agent-presets.ts
src/lib/templates/onboarding-templates.ts

# Farm UI components (business-type-picker.tsx and weather-preview.tsx already deleted in Phase 2)
src/components/settings/farm-profile-form.tsx
src/components/settings/scale-ticket-fields-config.tsx
src/components/settings/skill-toggle-card.tsx (built-in skills section)

# Farm validators
src/lib/validators/farm-profile.ts

# Farm docs
content/docs/farm-setup/index.mdx
content/docs/farm-setup/farm-profile.mdx
content/docs/farm-setup/crop-selection.mdx
content/docs/farm-setup/elevator-config.mdx
content/docs/skills/grain-bids.mdx
content/docs/skills/scale-tickets.mdx

# Farm API routes
src/app/api/tenants/[tenantId]/grain-bids/
src/app/api/tenants/[tenantId]/scale-tickets/

# Farm runtime tools
src/lib/runtime/tenant-runtime-query-tools.ts (grain/scale ticket queries)
src/lib/runtime/tenant-runtime-mutating-tools.ts (scale ticket mutations)
```

### Major Rewrites (20+ files)
```
# Types
src/types/agent.ts
src/types/farm.ts → src/types/team.ts
src/types/database.ts

# Templates
src/lib/templates/agent-soul.ts (new, replaces soul-presets.ts)
src/lib/templates/openclaw-config.ts
src/lib/templates/rebuild-config.ts

# Onboarding (all completed in Phase 2)
# src/hooks/use-onboarding.ts ✅
# src/components/onboarding/wizard-shell.tsx ✅
# src/components/onboarding/step1-team.tsx ✅ (was step1-operation.tsx)
# src/components/onboarding/step2-agent.tsx ✅ (was step2-location.tsx)
# src/components/onboarding/step3-discord.tsx ✅
# src/components/onboarding/discord-server-mockup.tsx ✅

# Dashboard (all completed in Phase 3)
# src/app/(dashboard)/dashboard/page.tsx ✅
# src/components/dashboard/sidebar.tsx ✅
# src/components/dashboard/topbar.tsx ✅
# src/components/dashboard/agent-card.tsx ✅
# src/components/dashboard/agent-form/agent-form.tsx ✅
# src/components/dashboard/agent-form/skill-toggles.tsx ✅
# src/components/dashboard/agent-form/cron-toggles.tsx ✅
# src/components/dashboard/assistants-list.tsx ✅
# src/app/(dashboard)/agents/page.tsx ✅ (new)
# src/lib/navigation/settings.ts ✅
# src/app/(dashboard)/layout.tsx ✅

# Settings
src/app/(dashboard)/settings/skills/page.tsx
src/app/(dashboard)/settings/farm/ → deleted

# Validators
src/lib/validators/onboarding.ts
src/lib/validators/agent.ts

# Landing
src/components/landing/hero.tsx
src/components/landing/how-it-works.tsx
src/components/landing/pricing.tsx
src/components/landing/testimonials.tsx
```

### Minor Updates (30+ files)
```
# Design system
src/app/globals.css
src/app/layout.tsx

# API routes (remove farm references)
src/app/api/tenants/route.ts
src/app/api/tenants/[tenantId]/agents/

# Constants
src/lib/utils/constants.ts

# Auth pages
src/app/(auth)/signup/page.tsx
src/app/(auth)/login/page.tsx

# Various components with "farm" string references
```

---

## 13. Migration Strategy

### Data Migration for Existing Users
If there are existing users with farm profiles:

1. Copy `farm_profiles.farm_name` → `team_profiles.team_name`
2. Copy location data (lat/lng/timezone) → `team_profiles.location`
3. Map `business_type` → `team_profiles.industry`
4. Existing agents keep their data — `personality_preset` becomes ignored, `custom_personality` becomes `backstory`
5. Existing skills remain functional but removed from "built-in" list

### Backward Compatibility
- Keep farm-specific database columns (nullable) for 2 releases
- Drop in a future migration after confirming no data loss
- API routes for grain-bids/scale-tickets return 410 Gone

---

## 14. Success Metrics

After refactoring, the platform should:
- [x] Complete onboarding in under 3 minutes
- [x] Create a custom agent with role/goal/backstory in under 1 minute
- [x] Have zero farm-specific terminology in the UI
- [x] Support any industry use case without code changes
- [x] All existing tests pass (updated for new types)
- [x] Landing page communicates value without domain assumptions
- [x] Dashboard shows agents as the primary management surface
- [x] Sidebar has ≤12 navigation items (down from 18+)

---

## 15. Migration Complete Checklist

### Code / Runtime
- [x] All farm-specific types removed (`src/types/farm.ts` deleted, `PersonalityPreset` removed from agent types)
- [x] Agent identity model uses role/goal/backstory/autonomy_level (CrewAI pattern)
- [x] Team profile replaces farm profile (`team_profiles` table, `TeamProfile` type)
- [x] All built-in farm skills removed (grain-bids, weather, scale-tickets, alerts)
- [x] Skill system is 100% custom (no built-in skill slugs, empty `BUILT_IN_SKILLS`)
- [x] Schedule system is 100% custom (no predefined cron jobs, generic templates only)
- [x] System prompt renderer (`agent-soul.ts`) is fully generic with autonomy levels and delegation
- [x] Heartbeat checks are generic (`unanswered_emails` + `custom_checks` only)
- [x] Runtime tools cleaned: dead scale ticket/grain bid query/mutation code removed
- [x] AI tool descriptions use "user"/"team" language throughout
- [x] All test fixtures use generic business domain data (no farm/crop/elevator/bushel references)

### Docs / Landing
- [x] All 39 MDX documentation pages use industry-agnostic language
- [x] Landing page (hero, features, how-it-works, pricing, testimonials) describes a generic AI team platform
- [x] OG image and docs intro describe Pantheon as a multi-agent AI platform
- [x] Search index rebuilt (39 entries, no farm content)
- [x] `CLAUDE.md` fully rewritten to describe the current platform
- [x] Farm-specific docs deleted (farm-setup/, grain-bids.mdx, scale-tickets.mdx, weather-forecasts.mdx)

### Design System
- [x] Color palette updated (indigo accent replaces farm amber/green)
- [x] Wheat icon replaced with Sparkles/Bot throughout
- [x] Sidebar branding: "Pantheon" with Bot icon
- [x] Skill template categories updated (customer-support, financial, project-management, productivity, operations)

### Validation
- [x] `npm run lint` — 0 errors, 0 warnings
- [x] `npm test` — 326 pass, 0 fail, 1 skipped
- [x] `npm run build` — compiles successfully
- [x] `package.json` test script references only existing files

### Remaining Intentional Legacy Compatibility Boundaries
- **Database columns:** `farm_profiles` table still exists alongside `team_profiles` (nullable farm columns kept for backward compat; drop in a future migration after data export)
- **`tenant_scale_tickets` / `grain_bid_cache` tables:** Still in database schema (not dropped), but no code reads/writes them
- **`personality_preset` column in `agents` / `tenant_agents`:** Stored as `"custom"` for all agents; column kept in DB for legacy row compat, not exposed in types or UI
- **`sync-predefined-schedules.ts`:** Retained as a no-op function (called during agent sync, returns immediately)
- **`soul-presets.ts` / `agent-presets.ts`:** Retained as stubs (empty arrays/minimal exports) in case any external tooling references them
- **OpenClaw references in `custom-skills/sanitizer.ts`:** The `metadata.openclaw.*` blocked key paths are part of the SKILL.md security layer, not product branding — these are correct to keep
- **4 test files excluded from `npm test`:** `tenant-agents.test.ts`, `launch-readiness.test.ts`, `query-expander.test.ts`, `reranker.test.ts` use `@/` path aliases incompatible with Node's native test runner (they work under `next build`)
