# Visual Builder Rollout Strategy

Last updated: February 16, 2026

## Objective

Roll out workflow builder changes in controlled rings to reduce blast radius and preserve operator trust.

## Ring Model

- `canary`: first 10% of customers (deterministic customer-ID bucket).
- `standard`: next 60% of customers.
- `delayed`: final 30% of customers.

Ring targeting is controlled by `WORKFLOW_BUILDER_ROLLOUT_TARGET_RING`.

Valid values:
- `canary`
- `standard`
- `delayed`

If missing or invalid, rollout defaults to `delayed`.

## Promotion Policy

Promote only after the current ring has:

1. No unresolved P1 workflow incidents for 48h.
2. Stable run success and retry recovery metrics.
3. No sustained regression in approval cycle time.
4. Performance gate checks reviewed (`INP`, `LCP`, `CLS`).

## Halt / Rollback Policy

Immediately halt or roll back ring target when any of these occur:

1. P1 incident linked to workflow builder release.
2. Repeated publish failures after deployment refresh.
3. Gate failures persisting across two review windows.

Rollback action:
1. Set `WORKFLOW_BUILDER_ROLLOUT_TARGET_RING` to prior ring.
2. Re-run launch readiness review.
3. Keep promotion frozen until corrective actions are complete.

## Ownership

- Release owner: Workflow platform engineer on-call.
- Decision owner: Product + support lead.
- Approval required for ring promotion: Engineering + Support.
