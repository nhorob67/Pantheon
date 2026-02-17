# Visual Builder Phase 7 Verification

Last updated: February 16, 2026

## Purpose

This runbook defines how to verify Phase 7 launch gates for workflow builder accessibility and performance.

## Accessibility Verification

Run the checks on:
- `/settings/workflows` (list route)
- `/settings/workflows/[workflowId]` (builder route)

Checklist:
1. Keyboard-only operation
   - `Tab`/`Shift+Tab` reaches all controls.
   - Builder canvas selection can be cleared with `Esc`.
   - Selected node can be moved with arrow keys (`Shift` + arrows for larger step).
2. Visible focus states
   - All buttons, links, selects, inputs, and command-palette items show a visible focus ring.
3. Screen-reader semantics
   - Form controls have labels.
   - Save/publish status is announced (`aria-live`).
   - Validation errors are announced (`role="alert"`).
4. Touch target conformance
   - Primary interactive controls in builder/list are at least `44x44`.
5. Reduced motion
   - Loading indicators use `motion-safe` animation behavior.

## Performance Verification

### Telemetry Capture

Workflow routes emit web-vitals metrics (INP, LCP, CLS) via:
- `src/components/workflows/workflow-performance-beacon.tsx`
- `POST /api/instances/:id/workflows/performance`

Stored event type:
- `workflow.web_vital`

### Gate Evaluation API

Use:
- `GET /api/instances/:id/workflows/performance?days=14&min_samples=20`

Response includes:
- Per-route p75 metrics
- Gate checks (`builder_inp`, `builder_lcp`, `builder_cls`, `list_cls`)
- Overall status (`pass`, `fail`, `insufficient_data`)

### Launch thresholds

- Builder INP p75 <= `200ms`
- Builder LCP p75 <= `2500ms`
- Builder CLS p75 <= `0.1`
- List CLS p75 <= `0.1`

## Developer Validation Commands

```bash
npm run lint
npm run build
npm test
```
