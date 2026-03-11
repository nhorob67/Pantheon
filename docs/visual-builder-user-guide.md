# Pantheon Visual Builder User Guide

Last updated: February 16, 2026

## 1) Who This Is For

This guide is for operators who build and run workflow automations from the Pantheon dashboard without calling APIs directly.

## 2) Accessing The Builder

1. Open dashboard settings.
2. Go to **Workflows** (`/settings/workflows`).
3. Use:
- **New workflow** to create a draft.
- An existing workflow row to open the builder.
- **View runs** to open run explorer.

## 3) Creating A Workflow

1. Click **New workflow**.
2. Enter a workflow name (required).
3. Add description (optional).
4. Choose a starter template:
- **Blank workflow** for manual graph design.
- **Linear flow** for trigger -> action -> end.
- **Branching flow** for condition-based paths.
5. Click **Create workflow**.

You are redirected to the visual builder after creation.

## 4) Editing In The Builder

Builder layout:
- Left rail: node library.
- Center: workflow canvas.
- Right rail: node inspector and validation.

Core actions:
- Drag/drop nodes from library.
- Connect nodes by creating edges.
- Select node to edit config.
- Delete or duplicate selected nodes.
- Manual save with **Save**.
- Autosave runs after inactivity.

Keyboard shortcuts:
- `Cmd/Ctrl + S`: save
- `Cmd/Ctrl + Z`: undo
- `Shift + Cmd/Ctrl + Z`: redo
- `Delete/Backspace`: delete selected node

## 5) Validation And Publish

Before publish:
1. Resolve validation errors shown in the right panel.
2. Click **Publish**.

Publish behavior:
- Promotes current draft as the active published version.
- Triggers runtime rebuild/deploy for the instance.
- Returns an error if deploy fails.

## 6) Running And Monitoring

From builder:
- Click **Run** to queue a manual run.
- Click **Runs** to open run explorer filtered to that workflow.

From run explorer (`/settings/workflows/runs`):
- Filter by workflow and run status.
- Open any run to inspect:
- run metadata
- step-by-step timeline
- step input/output payloads
- errors
- artifacts

## 7) Recovery Actions

### Full Rerun

Use **Rerun workflow** on a completed run to queue a new run from the latest published workflow version.

### Retry From Failed Step

When a run is `failed` or `canceled`, failed/canceled steps show **Retry from here**.
This queues a retry run anchored to the selected step.

## 8) Rollback Published Version

Use **Rollback** in builder to move published state to the prior version.

Guardrails:
- Workflow must already be published.
- A prior version must exist.
- Rollback triggers runtime rebuild/deploy.
- If deploy fails, publish state is automatically restored.

## 9) Artifact Download And Export

In run timeline:
- If an artifact has storage metadata, use **Download artifact**.
- If it is payload-only, use **Export payload JSON**.

## 10) Common Issues

### "Workflow is invalid and cannot be published."

Fix validation errors first, save, and retry publish.

### "No prior published version is available for rollback."

Publish at least one newer version before rollback can target a previous one.

### Retry button disabled on a step

Retry is allowed only when:
- run status is `failed` or `canceled`
- step status is `failed` or `canceled`

## 11) Launch Readiness Dashboard

Use **Launch readiness** (`/settings/workflows/launch`) to monitor:
- rollout ring assignment (`canary`, `standard`, `delayed`)
- KPI baseline metrics for adoption and reliability
- performance gate status (`INP`, `LCP`, `CLS`)
- weekly review cadence and action agenda

## 12) Operational Notes

- Published runs always execute against the currently published version.
- Draft edits do not affect runtime until published.
- Run events and artifacts are recorded with per-tenant isolation.
