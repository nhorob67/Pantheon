-- Runtime Obligations: durable state machine for tracking user-facing task commitments.
-- Replaces fragile prose-based follow-up detection with persisted obligation lifecycle.

-- ---------------------------------------------------------------------------
-- runtime_obligations — current state of each user-facing obligation
-- ---------------------------------------------------------------------------
create table if not exists runtime_obligations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  customer_id   uuid not null references customers(id) on delete cascade,

  -- Context: where this obligation originated
  session_id        uuid,
  channel_id        text,
  reply_to_message_id text,
  agent_id          uuid,

  -- Run linkage
  originating_run_id uuid not null references tenant_runtime_runs(id),
  current_run_id     uuid references tenant_runtime_runs(id),
  completion_run_id  uuid references tenant_runtime_runs(id),

  -- State machine
  status text not null default 'open'
    check (status in (
      'open',                -- actively being worked on
      'waiting_approval',    -- blocked on human approval
      'waiting_external',    -- blocked on external system callback
      'scheduled_follow_up', -- follow-up run is queued
      'stalled',             -- sweeper detected no progress; will retry once
      'completed',           -- terminal: task done
      'failed',              -- terminal: task could not be completed
      'canceled'             -- terminal: user or system canceled
    )),

  -- What the obligation is waiting on (nullable, set when status is waiting_*)
  waiting_on         text,
  resume_token       text unique,

  -- Timing
  next_check_at      timestamptz,
  last_progress_at   timestamptz not null default now(),
  last_user_update_at timestamptz,
  deadline_at        timestamptz,

  -- Continuation tracking (prevents infinite follow-up loops)
  continuation_count int not null default 0,
  max_continuations  int not null default 5,

  -- Dedup & idempotency
  dedupe_key         text unique,

  -- Observability
  metadata           jsonb not null default '{}',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists idx_obligations_tenant_status
  on runtime_obligations(tenant_id, status);

create index if not exists idx_obligations_next_check
  on runtime_obligations(next_check_at)
  where status not in ('completed', 'failed', 'canceled');

create index if not exists idx_obligations_originating_run
  on runtime_obligations(originating_run_id);

create index if not exists idx_obligations_current_run
  on runtime_obligations(current_run_id);

create index if not exists idx_obligations_resume_token
  on runtime_obligations(resume_token)
  where resume_token is not null;

create index if not exists idx_obligations_stale
  on runtime_obligations(last_progress_at)
  where status not in ('completed', 'failed', 'canceled');

-- RLS
alter table runtime_obligations enable row level security;

create policy "Customers see own obligations"
  on runtime_obligations for select
  using (customer_id = auth.uid());

create policy "Service role full access to obligations"
  on runtime_obligations for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- runtime_obligation_events — append-only audit log of state transitions
-- ---------------------------------------------------------------------------
create table if not exists runtime_obligation_events (
  id             uuid primary key default gen_random_uuid(),
  obligation_id  uuid not null references runtime_obligations(id) on delete cascade,
  run_id         uuid references tenant_runtime_runs(id),

  event_type text not null
    check (event_type in (
      'created',
      'run_started',
      'tool_phase',
      'progress_update_sent',
      'approval_requested',
      'approval_granted',
      'approval_rejected',
      'external_wait_started',
      'external_event_received',
      'follow_up_scheduled',
      'follow_up_started',
      'heartbeat',
      'stalled',
      'retry_scheduled',
      'completed',
      'failed',
      'canceled'
    )),

  -- Previous and new status for this transition
  from_status text,
  to_status   text,

  -- Idempotency
  idempotency_key text,

  -- Event-specific payload
  payload    jsonb not null default '{}',

  created_at timestamptz not null default now()
);

create index if not exists idx_obligation_events_obligation
  on runtime_obligation_events(obligation_id, created_at);

create index if not exists idx_obligation_events_idempotency
  on runtime_obligation_events(idempotency_key)
  where idempotency_key is not null;

-- RLS
alter table runtime_obligation_events enable row level security;

create policy "Customers see own obligation events"
  on runtime_obligation_events for select
  using (
    obligation_id in (
      select id from runtime_obligations where customer_id = auth.uid()
    )
  );

create policy "Service role full access to obligation events"
  on runtime_obligation_events for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Feature flag: enable obligation tracking (shadow mode first)
-- ---------------------------------------------------------------------------
insert into feature_flags (flag_key, description, default_enabled, owner)
values (
  'runtime_obligations_enabled',
  'Obligation tracking: when enabled, shadow-writes obligation records alongside existing progress system',
  false,
  'runtime'
)
on conflict (flag_key) do nothing;
