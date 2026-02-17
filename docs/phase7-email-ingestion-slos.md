# Phase 7 Runbook: Email Ingestion SLOs + Alert Thresholds

This runbook defines initial production SLOs for inbound email ingestion and
how to measure them from canonical tables.

## SLO Window

1. Rolling 7 days for alerting sensitivity.
2. Rolling 30 days for release/cutover decisions.

## SLO Definitions

1. Success SLO:
   - At least 95% of inbound rows reach `status='processed'`.
2. Latency SLO (P95):
   - At least 95% of processed rows complete within 5 minutes from `received_at`
     to `processed_at`.
3. Latency SLO (P99):
   - At least 99% of processed rows complete within 15 minutes.
4. Duplicate webhook rate:
   - `duplicate_event` webhook outcomes stay below 10% of total received webhook
     events (higher values indicate upstream replay/noise that should be reviewed).
5. Poison message budget:
   - Rows with `status='failed'` and retry cap exceeded remain below 1% of inbound.

## Alert Thresholds

Trigger warning alerts if any are true in rolling 1 hour:

1. Success rate < 90%.
2. P95 latency > 10 minutes.
3. Poison message rate > 2%.

Trigger critical alerts if any are true in rolling 1 hour:

1. Success rate < 80%.
2. P95 latency > 20 minutes.
3. Processor claimed jobs = 0 for 15+ minutes while queued backlog exists.

## SQL Measurement Queries

Use:
1. `scripts/email/check-ingestion-slos.sql`

Run in Supabase SQL editor or `psql` with the same database credentials.

## Operational Notes

1. During early rollout, treat first 72 hours as burn-in and tune thresholds.
2. Keep Resend fallback enabled until 30-day SLO window is consistently healthy.
3. Revisit SLOs before Phase IV outbound launch.
