# Multi-Tenant Runtime Migration Charter

Last updated: February 24, 2026  
Scope: Pre-launch migration from instance-centric runtime to tenant-first Discord runtime

## Mission

Ship a tenant-native runtime path that is stable, observable, and secure before public launch, while keeping legacy instance bridges only for internal dogfood continuity.

## In-scope

1. Tenant-first schema, RLS model, and API namespace.
2. Central Discord ingress + runtime queue/worker orchestration.
3. Tenant tool policy, approvals, and audit trails.
4. Tenant export ownership guarantees with manifest-based artifacts.

## Out-of-scope (pre-launch)

1. New visual workflow-builder feature expansion.
2. Broad non-Discord channel expansion.
3. Customer cutover mechanics beyond internal rehearsal paths.

## Guardrails

1. Tenant isolation is non-negotiable: no cross-tenant data leakage.
2. All high-risk tool actions require explicit policy + approval controls.
3. Runtime rollout is flag-gated and kill-switch controlled.
4. Launch-critical routes must keep standardized request tracing and envelopes.

## Success metrics and release gates

## Product quality gates

1. Conversation runtime:
   - p95 queue-to-terminal latency within target SLO.
   - Stable success rate for canary tenant runtime runs.
2. Tool governance:
   - No policy bypasses in security test coverage.
   - Approval queue decisions reliably resume/reject pending runs.
3. Retrieval/memory quality:
   - Regression suite remains stable for launch-critical replay scenarios.
4. Data ownership:
   - Tenant export jobs complete successfully with manifest and signed manifest artifacts.

## Program gates

1. Phase 1 data verification passes with zero critical integrity findings (blocked until Supabase credentials are available).
2. Phase 3 load/recovery/release-gate evidence is captured with non-placeholder environment configuration.
3. Incident and outage runbooks exist for runtime, exports, memory/index integrity, and Discord degradation.

## Ownership model

1. Engineering: implements and validates migration slices and rollback safety.
2. Product: owns launch scope boundaries and deprecation posture.
3. Operations: owns runtime incident execution and recovery flow during canary/launch windows.
