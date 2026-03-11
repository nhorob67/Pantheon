# Pantheon Heartbeat Reporting And Filtering Design

**Date:** 2026-03-09
**Author:** Codex
**Status:** Approved

## Summary

Heartbeat reporting should stay inside the existing tenant heartbeat settings surface and expand it into a tabbed operations workspace. The reporting surface must support three operator jobs equally well:

1. Debugging a single missed, noisy, or unexpected heartbeat
2. Spotting heartbeat trends over time for one tenant
3. Auditing operator actions, manual tests, and approval outcomes

## Recommended UX

Add a tabbed reporting workspace beneath the existing heartbeat controls:

- `Runs`
- `Trends`
- `Audit`

### Runs

The `Runs` tab is the debugging surface.

It should support filters for:

- config
- delivery status
- trigger mode
- signal type
- date range
- text search

It should render a paginated run list and a run inspector that shows:

- decision trace
- checks executed and durations
- freshness metadata
- suppression/defer reason
- approval context
- runtime run reference
- sent excerpt when available

### Trends

The `Trends` tab is the tenant-level reporting surface.

It should support date range and optional config grouping, then show:

- delivery outcomes over time
- top signal types
- suppression and defer reasons
- latency and token usage summaries
- issue age distribution
- approval volume

### Audit

The `Audit` tab is the operator accountability surface.

It should provide a unified chronological feed built from:

- `tenant_heartbeat_events`
- manual heartbeat runs, previews, and tests
- heartbeat-related approval records

It should answer:

- who changed heartbeat behavior
- when tests were sent
- when approvals were requested
- whether approvals were approved or rejected

## Data Plan

Split the current recent-summary query into one overview query plus tab-specific report queries:

- `fetchHeartbeatOverview`
- `fetchHeartbeatRunsReport`
- `fetchHeartbeatTrendsReport`
- `fetchHeartbeatAuditReport`

The existing tables are sufficient for the first pass:

- `tenant_heartbeat_configs`
- `tenant_heartbeat_runs`
- `tenant_heartbeat_signals`
- `tenant_heartbeat_events`
- `tenant_approvals`

No new reporting table is required in the first implementation.

## API Plan

Reuse the tenant heartbeat activity endpoint as a report endpoint with query-driven modes:

- `overview`
- `runs`
- `trends`
- `audit`

Each report mode should accept typed filters and return only the shape required by its tab.

## UI Plan

Keep the existing top-of-page heartbeat controls unchanged:

- save
- pause/resume
- preview
- run now
- test send
- config editor
- override management
- issue panel

Replace the current recent-only operations area with the tabbed reporting workspace.

## Delivery Order

Build the approved scope in one shot, but stage the work internally in this order:

1. reporting types and query layer
2. report endpoint filters and responses
3. `Runs` tab with inspector
4. `Audit` tab with unified feed
5. `Trends` tab with longer-window summaries
6. validation and polish

## Validation

Minimum validation should cover:

- report filter correctness
- pagination behavior
- date-range behavior
- run inspector completeness
- approval/test/audit linking
- page load and interaction sanity in the heartbeat settings UI
