# Pantheon Memory Vault Implementation Checklist

Last updated: February 15, 2026  
Status: Completed

## 1) Objective

Implement a hybrid memory stack for Pantheon:
1. Preserve OpenClaw native memory as baseline.
2. Add per-instance local-vault settings and operational controls.
3. Expose authenticated dashboard controls and API contracts.
4. Prepare runtime/deploy path for persistent local vault storage.

## 2) Status Legend

- [ ] Not started
- [~] In progress
- [x] Completed
- [!] Blocked

## 3) File-By-File Execution Checklist

### A. Planning + Contracts
- [x] `plans/memory-vault-implementation-checklist.md`
  - Define migration schema (exact SQL).
  - Define API contracts (request/response/error model).
  - Track execution progress and blockers.

### B. Database + Types + Validation
- [x] `supabase/migrations/00018_memory_vault_settings.sql`
  - Add `instance_memory_settings` table.
  - Add `memory_operations` table.
  - Add indexes, constraints, RLS policies, updated_at trigger.
- [x] `supabase/migrations/00019_memory_operation_processor.sql`
  - Add concurrency-safe `claim_memory_operations(p_limit)` RPC function.
  - Add queued-operations index for efficient worker scans.
- [x] `src/types/memory.ts`
  - Add memory settings + operations TS contracts.
- [x] `src/types/database.ts`
  - Export new memory types for app usage.
- [x] `src/lib/validators/memory.ts`
  - Add zod schemas for settings update + operation request.

### C. API Endpoints
- [x] `src/app/api/instances/[id]/memory/settings/route.ts`
  - `GET` effective settings.
  - `PUT` upsert settings + trigger config rebuild.
- [x] `src/app/api/instances/[id]/memory/checkpoint/route.ts`
  - `POST` queue checkpoint operation.
- [x] `src/app/api/instances/[id]/memory/compress/route.ts`
  - `POST` queue compress operation.
- [x] `src/app/api/admin/memory/process-operations/route.ts`
  - `GET`/`POST` authenticated processor for queued memory operations.
  - Claim queued operations via RPC and transition statuses to `running`/`completed`/`failed`.
  - Executes runtime checkpoint/compress via OpenClaw gateway `exec` tool, with Coolify restart fallback.

### D. Config + Deploy Wiring
- [x] `src/lib/templates/rebuild-config.ts`
  - Read memory settings.
  - Push memory env vars to instance during rebuild.
- [x] `src/app/api/instances/provision/route.ts`
  - Seed memory env vars during initial app create.
- [x] `src/lib/templates/openclaw-config.ts`
  - Keep native memory enabled; accept memory settings hook points.

### E. Dashboard UX
- [x] `src/app/(dashboard)/settings/layout.tsx`
  - Add Memory tab.
- [x] `src/components/dashboard/sidebar.tsx`
  - Add Memory nav item.
- [x] `src/app/(dashboard)/settings/memory/page.tsx`
  - Load instance + memory settings.
- [x] `src/components/settings/memory-settings-panel.tsx`
  - Mode/settings controls + checkpoint/compress actions.

### F. Runtime Persistence Prep
- [x] `docker/docker-compose.dev.yml`
  - Add dedicated dev vault volume mount.
- [x] `docker/entrypoint.sh`
  - Ensure vault directory exists with secure permissions.
- [x] `src/lib/coolify/types.ts`
  - Extend create-app params for future persistent mounts.
- [x] `src/lib/coolify/client.ts`
  - Implement production payload support for persistent mounts.
- [x] `src/lib/coolify/mock.ts`
  - Keep mock interface parity (no code changes required; optional field is backward compatible).
- [x] `scripts/memory/process-operations-cron.sh`
  - Add scheduler helper script for invoking memory operation processor.
- [x] `.env.local.example`
  - Document `MEMORY_PROCESSOR_TOKEN` for processor auth.
- [x] `vercel.json`
  - Add cron trigger for memory operation processor route.

### G. Runtime Execution
- [x] Runtime-native checkpoint/compress command execution.
  - Processor now attempts runtime execution via OpenClaw gateway `/tools/invoke` (`exec`) against each instance.
  - Added configurable command/env overrides for checkpoint/compress execution.
  - Keeps Coolify restart fallback when runtime execution is unavailable/fails.

### H. Validation
- [x] Run `npm run lint`.
  - Completed on 2026-02-15 (0 errors, 2 warnings in `src/components/docs/mdx-components.tsx`).
- [x] Run `npm run build`.
  - Completed on 2026-02-15.
  - Notes: required running outside sandbox due Turbopack sandbox OS restriction (`Operation not permitted`).
- [x] Run targeted ESLint on changed memory implementation files.
- [x] Run `npm test`.
  - Completed on 2026-02-15 (`23/23` passing).

## 4) Exact Migration Scheme (`00018_memory_vault_settings.sql`)

```sql
CREATE TABLE IF NOT EXISTS instance_memory_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'native_only'
    CHECK (mode IN ('native_only', 'hybrid_local_vault')),
  capture_level TEXT NOT NULL DEFAULT 'standard'
    CHECK (capture_level IN ('conservative', 'standard', 'aggressive')),
  retention_days INTEGER NOT NULL DEFAULT 365
    CHECK (retention_days >= 7 AND retention_days <= 3650),
  exclude_categories TEXT[] NOT NULL DEFAULT '{}',
  auto_checkpoint BOOLEAN NOT NULL DEFAULT true,
  auto_compress BOOLEAN NOT NULL DEFAULT true,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT instance_memory_settings_instance_unique UNIQUE (instance_id)
);

CREATE INDEX IF NOT EXISTS idx_instance_memory_settings_customer
  ON instance_memory_settings(customer_id);

ALTER TABLE instance_memory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memory settings"
  ON instance_memory_settings FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own memory settings"
  ON instance_memory_settings FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own memory settings"
  ON instance_memory_settings FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own memory settings"
  ON instance_memory_settings FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS memory_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL
    CHECK (operation_type IN ('checkpoint', 'compress')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  requested_by TEXT,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_operations_instance_created
  ON memory_operations(instance_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_operations_customer_created
  ON memory_operations(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_operations_status
  ON memory_operations(status);

ALTER TABLE memory_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memory operations"
  ON memory_operations FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own memory operations"
  ON memory_operations FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own memory operations"
  ON memory_operations FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own memory operations"
  ON memory_operations FOR DELETE
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_instance_memory_settings_updated_at'
      AND tgrelid = 'instance_memory_settings'::regclass
  ) THEN
    CREATE TRIGGER set_instance_memory_settings_updated_at
      BEFORE UPDATE ON instance_memory_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_memory_operations_updated_at'
      AND tgrelid = 'memory_operations'::regclass
  ) THEN
    CREATE TRIGGER set_memory_operations_updated_at
      BEFORE UPDATE ON memory_operations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
```

## 4.1) Processor Migration Scheme (`00019_memory_operation_processor.sql`)

```sql
CREATE INDEX IF NOT EXISTS idx_memory_operations_status_queued_at
  ON memory_operations (status, queued_at)
  WHERE status = 'queued';

CREATE OR REPLACE FUNCTION claim_memory_operations(
  p_limit INTEGER
)
RETURNS TABLE (
  id UUID,
  instance_id UUID,
  customer_id UUID,
  operation_type TEXT,
  input JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH rows_to_claim AS (
    SELECT m.id
    FROM memory_operations m
    WHERE m.status = 'queued'
    ORDER BY m.queued_at ASC
    LIMIT GREATEST(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE memory_operations m
    SET
      status = 'running',
      started_at = COALESCE(m.started_at, now()),
      error_message = NULL,
      updated_at = now()
    WHERE m.id IN (SELECT id FROM rows_to_claim)
    RETURNING
      m.id,
      m.instance_id,
      m.customer_id,
      m.operation_type,
      m.input
  )
  SELECT
    c.id,
    c.instance_id,
    c.customer_id,
    c.operation_type,
    c.input
  FROM claimed c;
END;
$$ LANGUAGE plpgsql;
```

## 5) API Contracts

### 5.1 `GET /api/instances/:id/memory/settings`

Response `200`:

```json
{
  "settings": {
    "instance_id": "uuid",
    "customer_id": "uuid",
    "mode": "native_only",
    "capture_level": "standard",
    "retention_days": 365,
    "exclude_categories": [],
    "auto_checkpoint": true,
    "auto_compress": true,
    "updated_by": null,
    "created_at": "ISO8601",
    "updated_at": "ISO8601"
  },
  "source": "default|stored"
}
```

Errors:
- `401` unauthorized
- `404` instance not found or ownership mismatch

### 5.2 `PUT /api/instances/:id/memory/settings`

Request body:

```json
{
  "mode": "hybrid_local_vault",
  "capture_level": "standard",
  "retention_days": 365,
  "exclude_categories": ["secrets", "otp"],
  "auto_checkpoint": true,
  "auto_compress": true
}
```

Response `200`:

```json
{
  "settings": { "...": "same shape as GET" },
  "rebuild": {
    "attempted": true,
    "succeeded": true
  }
}
```

Errors:
- `400` invalid payload
- `401` unauthorized
- `404` instance not found or ownership mismatch
- `429` rate limited

### 5.3 `POST /api/instances/:id/memory/checkpoint`

Request body:

```json
{
  "reason": "manual checkpoint before workflow changes"
}
```

Response `202`:

```json
{
  "operation": {
    "id": "uuid",
    "operation_type": "checkpoint",
    "status": "queued",
    "queued_at": "ISO8601"
  }
}
```

Errors:
- `400` invalid payload
- `401` unauthorized
- `404` instance not found or ownership mismatch
- `429` rate limited

### 5.4 `POST /api/instances/:id/memory/compress`

Request/response/error model matches checkpoint endpoint, with `operation_type: "compress"`.

### 5.5 `POST|GET /api/admin/memory/process-operations`

Auth:
- `Authorization: Bearer <MEMORY_PROCESSOR_TOKEN>` or `Authorization: Bearer <CRON_SECRET>`
- `POST` also permits authenticated admin session

Request body (`POST`) / query params (`GET`):

```json
{
  "batch_size": 10
}
```

Response `200`:

```json
{
  "claimed": 4,
  "completed": 3,
  "failed": 1
}
```

Errors:
- `403` forbidden
- `500` processor claim/load failure

## 6) Progress Log

- 2026-02-15: Created checklist, defined migration schema, and defined v1 API contracts.
- 2026-02-15: Started implementation slice B/C (migration + types/validators + API).
- 2026-02-15: Implemented migration `00018_memory_vault_settings.sql` for settings + operation queue with RLS and triggers.
- 2026-02-15: Added memory types/validators and exported shared contracts.
- 2026-02-15: Implemented memory settings/checkpoint/compress API routes under `/api/instances/[id]/memory/*`.
- 2026-02-15: Wired memory env vars into rebuild and initial provisioning paths.
- 2026-02-15: Added dashboard Memory settings page/panel and navigation entries.
- 2026-02-15: Added dev vault volume mount and entrypoint vault bootstrap path.
- 2026-02-15: Added migration `00019_memory_operation_processor.sql` with concurrency-safe memory operation claim RPC.
- 2026-02-15: Added `/api/admin/memory/process-operations` worker endpoint plus cron helper script and Vercel cron schedule.
- 2026-02-15: Hardened memory API request parsing to return `400` on malformed JSON payloads.
- 2026-02-15: Added runtime-native memory execution path via OpenClaw gateway `/tools/invoke` (`exec`) with configurable commands and Coolify restart fallback.
- 2026-02-15: Validation: full `npm run lint` now passes with warnings only (no errors).
- 2026-02-15: Validation: targeted ESLint passed on changed memory implementation files.
- 2026-02-15: Validation: `npm test` passed (`23/23` tests passing).
- 2026-02-15: Validation: `npm run build` passed (executed outside sandbox due Turbopack sandbox process restrictions).
- 2026-02-15: Validation unblock changes included local font fallback in `src/app/layout.tsx` and non-memory lint/type cleanups required by current branch state.
