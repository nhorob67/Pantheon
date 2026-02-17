-- FarmClaw email ingestion SLO checks
-- Usage: run in Supabase SQL editor or psql.

-- 1) 7-day status mix and success rate
with inbound_7d as (
  select *
  from email_inbound
  where received_at >= now() - interval '7 days'
)
select
  count(*) as total_inbound_7d,
  count(*) filter (where status = 'processed') as processed_7d,
  count(*) filter (where status = 'failed') as failed_7d,
  round(
    100.0 * count(*) filter (where status = 'processed')::numeric
      / nullif(count(*), 0),
    2
  ) as processed_pct_7d
from inbound_7d;

-- 2) 30-day status mix and success rate
with inbound_30d as (
  select *
  from email_inbound
  where received_at >= now() - interval '30 days'
)
select
  count(*) as total_inbound_30d,
  count(*) filter (where status = 'processed') as processed_30d,
  count(*) filter (where status = 'failed') as failed_30d,
  round(
    100.0 * count(*) filter (where status = 'processed')::numeric
      / nullif(count(*), 0),
    2
  ) as processed_pct_30d
from inbound_30d;

-- 3) Processing latency percentiles for processed rows (7 days)
with processed_7d as (
  select
    extract(epoch from (processed_at - received_at)) as latency_seconds
  from email_inbound
  where received_at >= now() - interval '7 days'
    and status = 'processed'
    and processed_at is not null
    and processed_at >= received_at
)
select
  count(*) as processed_rows,
  round(avg(latency_seconds)::numeric, 2) as avg_latency_seconds,
  round(percentile_cont(0.50) within group (order by latency_seconds)::numeric, 2) as p50_latency_seconds,
  round(percentile_cont(0.95) within group (order by latency_seconds)::numeric, 2) as p95_latency_seconds,
  round(percentile_cont(0.99) within group (order by latency_seconds)::numeric, 2) as p99_latency_seconds
from processed_7d;

-- 4) Poison-rate estimate (retry cap reached in last 7 days)
-- Adjust retry cap here to match scheduler/default max_retries.
with failed_7d as (
  select *
  from email_inbound
  where received_at >= now() - interval '7 days'
    and status = 'failed'
),
inbound_7d as (
  select *
  from email_inbound
  where received_at >= now() - interval '7 days'
)
select
  count(*) filter (where retry_count >= 5) as poison_failed_rows,
  count(*) as total_failed_rows,
  (select count(*) from inbound_7d) as total_inbound_rows,
  round(
    100.0 * count(*) filter (where retry_count >= 5)::numeric
      / nullif((select count(*) from inbound_7d), 0),
    2
  ) as poison_pct_of_inbound
from failed_7d;

-- 5) Webhook duplicate-event ratio (7 days, provider=agentmail)
with webhook_7d as (
  select *
  from email_webhook_counters
  where provider = 'agentmail'
    and bucket_date >= current_date - 7
),
totals as (
  select
    coalesce(sum(count) filter (where outcome = 'duplicate_event'), 0) as duplicate_events,
    coalesce(sum(count), 0) as total_events
  from webhook_7d
)
select
  duplicate_events,
  total_events,
  round(100.0 * duplicate_events::numeric / nullif(total_events, 0), 2) as duplicate_event_pct
from totals;
