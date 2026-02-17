# Visual Builder Support And Incident SOP

Last updated: February 16, 2026

## Scope

This SOP covers incidents in:
- visual workflow authoring
- workflow publish/deploy
- workflow runtime execution
- approval gating flows

## Severity Definitions

- `P1`: multi-customer outage or severe production impact.
- `P2`: single-customer blocker with no viable workaround.
- `P3`: degraded behavior with workaround available.

## Intake Template

Capture all of:
- customer ID
- instance ID
- workflow ID
- run ID(s)
- failing step ID(s)
- timestamp and timezone
- current rollout ring target

## Triage Steps

1. Confirm severity and assign incident commander.
2. Open `/settings/workflows/launch` for KPI and gate context.
3. Check workflow run detail and step-level errors.
4. Identify whether issue is authoring, deploy, or runtime execution.
5. Apply mitigation.

## Mitigations

### Authoring / Validation Regression

1. Block publish for impacted drafts.
2. Guide customer to known-good template/workaround.
3. Schedule fix and notify support channel.

### Publish / Deploy Failure

1. Retry publish once after checking runtime health.
2. If still failing, rollback to prior published version.
3. Pause rollout ring promotion.

### Runtime Execution Failure

1. Retry failed step from run explorer.
2. If repeatable, rerun from workflow start.
3. If systemic, rollback workflow and pause rollout ring.

## Communication Cadence

- P1: updates every 30 minutes.
- P2: updates every 60 minutes.
- P3: updates at key milestones (mitigated / fix deployed / monitoring complete).

## Exit Criteria

Incident can be closed when:
1. Customer impact is resolved.
2. Runbook mitigation validated.
3. Root cause documented.
4. Follow-up actions assigned (owner + due date).
