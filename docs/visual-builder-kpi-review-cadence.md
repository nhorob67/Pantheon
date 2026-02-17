# Visual Builder KPI Review Cadence

Last updated: February 16, 2026

## Weekly Cadence

- Day: Monday
- Time: 16:00 UTC
- Duration: 30 minutes
- Owner: Workflow Operations

## Dashboard Source

Primary source: `/settings/workflows/launch`

Review window: default 28 days unless incident response needs shorter windows.

## Required KPIs

- time-to-first-publish (median)
- draft-to-publish completion rate
- workflow run success rate
- retry rate
- retry recovery success rate
- approval cycle time (p50)
- weekly active workflow builders
- estimated operator hours saved

## Review Agenda

1. Check overall trend direction and outliers.
2. Review performance gates and sample sufficiency.
3. Identify rollout ring actions (promote, hold, rollback).
4. Capture owner/action/date for each deviation.

## Escalation Triggers

Escalate to incident workflow when:

1. Run success rate drops by 10+ points week-over-week.
2. Retry recovery success drops below 70%.
3. Approval cycle p50 increases by 2x week-over-week.
4. Any performance gate remains `fail` for two consecutive reviews.
