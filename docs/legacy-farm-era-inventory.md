# Legacy Farm-Era Artifact Inventory

Date: 2026-03-11
Status: Final
Context: Pantheon was originally built as an agriculture-focused platform. The industry-agnostic refactoring (migrations 00079 and 00080, plus cleanup plan `plans/2026-03-11-industry-agnostic-cleanup-plan.md`) removed farm-specific behavior from all runtime code, UI, and docs. This document inventories the remaining farm-era artifacts that are intentionally retained for compatibility.

## Database

### `farm_profiles` table (DEPRECATED, read-only)

- Created in migration `00001_initial_schema.sql`.
- Contains columns: `farm_name`, `primary_crops`, `elevators`, `elevator_urls`, `county`, `business_type`, `country`.
- **Status:** No active source code in `src/` reads or writes this table. Retained read-only so that legacy data remains accessible if needed for export or audit. Marked DEPRECATED in migration `00080_schema_convergence.sql`.
- **Replacement:** `team_profiles` (created in migration `00079_industry_agnostic_refactor.sql`) is the canonical source of truth for team identity.

### `tenant_scale_tickets` table

- Created in migration `00043_tenant_scale_tickets.sql`.
- No active code references this table. It will be dropped in a future migration.

### Legacy `agents` table columns

- `personality_preset` and `cron_jobs` columns exist on the `agents` table (migrations 00005, 00067).
- **Status:** Kept in the internal compat layer in `src/lib/runtime/tenant-agents.ts` for legacy DB sync only. Not exposed in public types or UI. `personality_preset` is always written as `"custom"`. `cron_jobs` is optional and no longer populated by new agent creation flows.
- **Retirement:** These columns will be dropped when the legacy `agents` table is fully retired in favor of `tenant_agents`.

### Stale tool seeds

- `tenant_grain_bid_query`, `tenant_scale_ticket_create`, `tenant_scale_ticket_list` were seeded in migration `00053`. Removed by migration `00080_schema_convergence.sql`.

### `grain_bid_cache` table

- Dropped in migration `00080_schema_convergence.sql`.

## Migration SQL files

All migration files under `supabase/migrations/` are immutable historical records. Many contain farm-era terminology (`farm_profiles`, `grain`, `crop`, `elevator`, etc.). These are not cleaned up because migrations must remain idempotent and match what was actually applied to the database.

## Runtime code

No remaining farm-specific runtime behavior. The weather tool (`src/lib/ai/tools/weather.ts`) provides industry-neutral `get_weather_forecast` and `get_weather_alerts` tools. Agriculture-specific tools (`get_spray_windows`, `get_gdd_accumulation`) were removed on 2026-03-11.

## Briefings

Legacy briefing section keys (`weather_summary`, `market_snapshot`, `activity_recap` from the farm era) are transparently migrated to generic keys on read via `migrateBriefingSections()` in the briefing API route. Legacy cron prompt keys (`morning_weather`, `daily_market_summary`, `evening_ticket_summary`) are retained in `CRON_PROMPTS` for existing DB rows that reference them.
