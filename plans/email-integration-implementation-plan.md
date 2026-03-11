# Pantheon Email Integration Implementation Plan (Hybrid)

Last updated: February 13, 2026

## 1) Decision Summary

1. Pantheon is adopting a hybrid long-term email architecture.
2. AgentMail will own mailbox infrastructure concerns (inbox provisioning, delivery, provider event stream, sender operations).
3. Pantheon will remain source-of-truth for canonical records, attachment storage, AV/quarantine policy, retention/deletion workflows, and container sync safety.
4. Email is optional product functionality, not a required onboarding step.

## 2) Project Goals

1. Give accounts an optional readable email address (`slug@pantheon.app`) for ingestion workflows.
2. Ingest inbound email into canonical Supabase data/storage with strong idempotency.
3. Support outbound sending with per-account aliases and auditable event history.
4. Keep OpenClaw cache non-authoritative and rebuildable from canonical storage.
5. Enforce security controls (webhook verification, AV scanning, quarantine, least privilege).

## 3) Scope Corrections From Prior Plan

1. `Cloudflare Email Worker + Resend receiving` is no longer the target long-term ingress architecture.
2. `Every active customer gets one active identity by default` is no longer correct; identity provisioning is now explicit opt-in via settings.
3. `Resend-specific processor coupling` is now transitional only; Phase II must become provider-adapter based (AgentMail primary, Resend fallback only during migration).

## 4) Architecture Target (Hybrid)

1. Customer enables email in settings (optional), which provisions mailbox identity with provider metadata.
2. Provider (AgentMail) emits inbound events to Pantheon webhook.
3. Pantheon webhook verifies signatures, deduplicates events, and writes `email_inbound` in `queued` state.
4. Pantheon processor claims queued rows, fetches full payload + attachments via provider adapter, stores raw + binaries to Supabase Storage, then marks `processed`/`failed`.
5. AV/quarantine gates control which artifacts are eligible for indexing and container sync.
6. Outbound uses provider send API with stored alias, while Pantheon logs lifecycle events in canonical tables.

## 5) Current Repo State (Source of Truth)

### Completed and retained
- [x] `00008_email_phase1.sql`: `email_identities`, `email_webhook_events`, `email_inbound` + RLS.
- [x] `00009_email_webhook_observability.sql`: webhook counter model + increment function.
- [x] `00010_email_phase2_processing.sql`: processing states, retry fields, attachments table, storage buckets, claim function.
- [x] Concurrency-safe identity slug provisioning and slug update service (`src/lib/email/identity.ts`).
- [x] Webhook observability helper (`src/lib/email/webhook-observability.ts`).
- [x] Async inbound processor endpoint and storage write path (`src/app/api/admin/email/process-inbound/route.ts`).

### Completed in this update (February 13, 2026)
- [x] Removed automatic identity provisioning from subscription/onboarding lifecycle code paths.
  - `src/lib/stripe/webhooks.ts`
  - `src/app/api/instances/provision/route.ts`
  - `src/app/api/customers/me/route.ts`
- [x] Converted email setup UX to explicit optional enablement flow.
  - `src/components/settings/email-identity-form.tsx`
  - `src/app/api/customers/email-identity/route.ts` (`POST` now enables identity; `GET` is read-only)
  - `src/app/(dashboard)/settings/email/page.tsx`
  - `src/app/(dashboard)/settings/layout.tsx`
  - `src/app/(dashboard)/settings/channels/page.tsx`
- [x] Started Phase I AgentMail integration foundation.
  - `src/lib/email/providers/agentmail.ts`
  - `src/lib/email/agentmail-identity.ts`
  - `src/app/api/webhooks/agentmail/route.ts`
  - `supabase/migrations/00011_email_phase1_agentmail.sql`
- [x] Started Phase II provider-adapter processing refactor.
  - `src/lib/email/inbound-provider-adapters.ts`
  - `src/app/api/admin/email/process-inbound/route.ts`
- [x] Added AgentMail staging replay + validation tooling.
  - `docs/phase2-agentmail-staging-validation-runbook.md`
  - `scripts/email/replay-agentmail-webhook.sh`
- [x] Completed optional-positioning copy pass across dashboard/settings surfaces.
  - `src/components/settings/email-identity-form.tsx`
  - `src/app/(dashboard)/settings/channels/page.tsx`
  - `src/app/(dashboard)/settings/email/page.tsx`
  - `src/app/(dashboard)/dashboard/page.tsx`
- [x] Completed onboarding regression checks (code-path + build-time checks).
  - Verified onboarding step flow still has 5 steps and no email step coupling.
  - Verified `ensureEmailIdentity(...)` is only called by explicit email enable API.
  - Validation commands: `npm run lint`, `npx tsc --noEmit` (pass), `npm run build` (known Google Fonts network failure in sandbox).

### Completed in this update (February 13, 2026, next-work slice execution)
- [x] Added scheduler-ready processor route support for cron providers.
  - `src/app/api/admin/email/process-inbound/route.ts` (`GET` support + shared handler + `CRON_SECRET` auth support)
- [x] Added cron/scheduler configuration assets.
  - `vercel.json` (1-minute cron for `/api/admin/email/process-inbound`)
  - `scripts/email/process-inbound-cron.sh` (external cron invocation helper)
  - `.env.local.example` (`CRON_SECRET`)
  - `docs/phase2-email-processor-runbook.md` (scheduler setup instructions for Vercel + external cron)
- [x] Started AgentMail delivery/domain operations work with concrete runbook assets.
  - `docs/phase1-agentmail-delivery-ops-runbook.md`
  - `docs/phase1-email-routing-runbook.md` (marked deprecated and redirected to AgentMail runbooks)
- [x] Added safe ingress deprecation switch for legacy Resend webhook intake.
  - `.env.local.example` (`EMAIL_RESEND_INGRESS_ENABLED=true`)
  - `src/app/api/webhooks/resend/route.ts` (returns `410` when disabled)
- [x] Added no-key hardening assets for webhook verification while staging credentials are pending.
  - `src/lib/email/webhook-signature.test.ts` (automated signature verification coverage)
  - `package.json` (`npm run test`)
  - `scripts/email/verify-agentmail-webhook-idempotency.sh` (duplicate-event replay validation)
  - `docs/phase2-agentmail-staging-validation-runbook.md` (idempotency step)
- [x] Defined initial ingestion SLOs/alert thresholds with executable SQL checks.
  - `docs/phase7-email-ingestion-slos.md`
  - `scripts/email/check-ingestion-slos.sql`
- [x] Added one-command staging E2E validation script (replay -> processor -> idempotency).
  - `scripts/email/staging-e2e-validation.sh`
  - `docs/phase2-agentmail-staging-validation-runbook.md` (Option C)
- [x] Added additional code hardening for processor auth + attachment safety.
  - `src/lib/security/constant-time.ts` + `src/lib/security/constant-time.test.ts`
  - `src/lib/email/processor-inputs.ts` + `src/lib/email/processor-inputs.test.ts`
  - `src/app/api/admin/email/process-inbound/route.ts` (constant-time token match, strict query parsing, base64 validation, max attachment size guard)
  - `.env.local.example` (`EMAIL_MAX_ATTACHMENT_BYTES`)

## 6) Phase Overview

| Phase | Name | Status |
|---|---|---|
| 0 | Hybrid pivot hardening + optional UX alignment | In Progress |
| I | AgentMail foundation (identity + webhook ingest contract) | In Progress |
| II | Provider-adapter processing + storage pipeline | In Progress |
| III | AV scanning + quarantine | Not Started |
| IV | Outbound sending + event logging | Not Started |
| V | Container cache sync (non-authoritative) | Not Started |
| VI | Retention + cancellation lifecycle | Not Started |
| VII | Cutover hardening + launch | Not Started |

## 7) Detailed Phase Checklists

## Phase 0: Hybrid Pivot Hardening (Current)

### Completed
- [x] Shifted email identity creation to explicit settings opt-in.
- [x] Kept onboarding path free of email setup requirements.
- [x] Made email discoverable as optional in Channels settings card.

### Remaining
- [ ] Add explicit customer-level `email_feature_enabled` state if product needs analytics/targeting beyond identity existence.
- [x] Add product copy pass across settings/dashboard to reinforce optional behavior.
- [x] Run regression checks for signup -> checkout -> onboarding -> dashboard path.

### Exit Criteria
- [x] New customers can fully onboard without any email identity side effects.
- [x] Email can be enabled later with one explicit user action.

## Phase I: AgentMail Foundation

### Provider Integration
- [x] Add `src/lib/email/providers/agentmail.ts` client wrapper (inbox create/list/get, inbound fetch, attachment fetch, outbound send).
- [x] Add provider config/env vars (`AGENTMAIL_API_KEY`, `AGENTMAIL_WEBHOOK_SECRET`, `AGENTMAIL_API_BASE_URL`).
- [x] Extend identity model to store provider mailbox identifiers/metadata.
- [x] Build AgentMail webhook route (`/api/webhooks/agentmail`) with signature verification + idempotency.
- [x] Wire explicit email enablement flow to provision/link AgentMail inbox metadata on identity.
- [x] Apply DB migration `00011_email_phase1_agentmail.sql` in environment.
- [ ] Set runtime AgentMail credentials (`AGENTMAIL_API_KEY`, `AGENTMAIL_WEBHOOK_SECRET`, `AGENTMAIL_API_BASE_URL`) when ready for live provisioning/webhook processing.

### Delivery & Domain Ops
- [x] Add AgentMail delivery/domain operations runbook and cutover gate checklist.
- [ ] Configure and verify sender/inbound domain in AgentMail.
- [ ] Validate SPF/DKIM/DMARC expectations against production DNS.
- [ ] Register webhook events required for inbound + outbound lifecycle tracking.

### Exit Criteria
- [ ] New enabled accounts get provider mailbox mapped to one Pantheon identity.
- [ ] AgentMail inbound events create queued rows with dedupe guarantees.

## Phase II: Provider-Adapter Processing + Canonical Storage

### Completed
- [x] Queue claim model, processing state machine, retry/backoff fields.
- [x] Attachment metadata table + private storage buckets.
- [x] Processor endpoint for queued job claims and storage writes.
- [x] Add AgentMail staging validation assets:
  - `docs/phase2-agentmail-staging-validation-runbook.md`
  - `scripts/email/replay-agentmail-webhook.sh`

### Remaining
- [x] Refactor processor to provider adapter interface (`resend`, `agentmail`).
- [x] Implement AgentMail adapter and make it primary-capable (runtime env-gated).
- [x] Keep Resend adapter as temporary fallback during cutover only (with explicit ingress kill-switch).
- [x] Add scheduler/cron configuration in repo for `/api/admin/email/process-inbound`.
- [x] Add processor safety guards (constant-time auth token checks + attachment size/base64 validation).
- [ ] Enable scheduler/cron jobs in staging+production environments.
- [ ] Execute staging replay + throughput validation.

### Exit Criteria
- [ ] >=95% of valid inbound messages reach `processed`.
- [ ] Failures carry clear actionable metadata and bounded retry behavior.

## Phase III: AV + Quarantine

- [ ] Add scanning worker/service (ClamAV + signature updates).
- [ ] Enforce file limits, mime allowlist, timeout policy.
- [ ] Mark attachment scan outcomes and quarantine reason codes.
- [ ] Block quarantined artifacts from indexing/container sync.
- [ ] Build admin quarantine inspection UI.

## Phase IV: Outbound + Event Logging

- [ ] Add outbound provider wrapper (AgentMail send).
- [ ] Add canonical `email_outbound` table for requests + status transitions.
- [ ] Persist provider IDs/events (accepted, delivered, bounced, complained, etc.).
- [ ] Add minimal customer/admin history views.

## Phase V: Container Cache Sync

- [ ] Add internal signed manifest/object-url API.
- [ ] Add container sync worker (startup + periodic).
- [ ] Sync only clean/approved objects.
- [ ] Add checksum validation and stale cache cleanup.

## Phase VI: Retention + Cancellation Lifecycle

- [ ] Add purge job model and daily purge worker.
- [ ] On cancel: queue deletion at `canceled_at + 30 days`.
- [ ] On reactivation within window: cancel pending purge.
- [ ] Track deletion audit records and admin inspection.

## Phase VII: Cutover Hardening + Launch

- [x] Define ingestion latency + success SLOs and alert thresholds.
- [ ] Add integration tests for signature verification + idempotency.
  - In progress: added unit coverage for signature verification and an operational idempotency replay script.
- [x] Add end-to-end staging script for inbound->processed path.
- [ ] Run production dry-run with internal accounts before broad rollout.

## 8) Code Removal / De-scope Map (From Already Added Code)

Remove only after AgentMail Phase I/II cutover is validated in staging and production.

1. `infra/cloudflare-email-worker/worker.js`
   - Action: remove routing worker once root-domain ingress is handled by AgentMail path.
2. `infra/cloudflare-email-worker/wrangler.toml.example`
   - Action: remove with worker decommission.
3. `src/app/api/webhooks/resend/route.ts`
   - Action: remove after `/api/webhooks/agentmail` is live and replay-tested.
4. `src/lib/email/resend-receiving.ts`
   - Action: remove once processor provider adapter no longer uses Resend fallback.
5. `docs/phase1-email-routing-runbook.md`
   - Action: complete (marked deprecated and replaced by AgentMail runbook references).
6. `docs/phase2-email-processor-runbook.md`
   - Action: complete (updated with provider-adapter scheduler operations and cron setup).
7. `.env.local.example` (`RESEND_WEBHOOK_SECRET`, `RESEND_API_BASE_URL`, Resend-specific notes)
   - Action: remove or mark deprecated after cutover.
8. `plans/email-integration-implementation-plan.md` legacy assumptions
   - Action: complete with this rewrite; keep this file as canonical execution plan.

### Keep (do not remove)
1. `email_identities`, `email_webhook_events`, `email_inbound`, `email_inbound_attachments` schema and related migrations.
2. `src/lib/email/identity.ts` (provider-agnostic identity/slug logic).
3. `src/lib/email/webhook-observability.ts` (general metrics/counters).
4. `src/app/api/admin/email/process-inbound/route.ts` (refactor for adapter pattern, do not delete).

## 9) Immediate Recommended Next Work Slice

1. [ ] Set AgentMail runtime credentials in staging and run the replay validation flow (`message.received -> queued -> processed`).
   - Status: `blocked` (requires staging credentials + external AgentMail message id + environment access).
2. [ ] Enable scheduler/cron in staging+production for `/api/admin/email/process-inbound`.
   - Status: `in_progress`
   - Completed in repo: route GET support, token auth compatibility (`EMAIL_PROCESSOR_TOKEN`/`CRON_SECRET`), `vercel.json` cron, external cron helper script, updated runbook.
3. [ ] Complete AgentMail delivery operations (domain verification, SPF/DKIM/DMARC checks, webhook registration) and then deprecate Resend ingress.
   - Status: `in_progress`
   - Completed in repo: `docs/phase1-agentmail-delivery-ops-runbook.md` + legacy Resend routing runbook deprecation notice.

## 10) Tracking Fields (Per Task)

1. Owner
2. Target date
3. Status (`todo`, `in_progress`, `blocked`, `done`)
4. Risk (`low`, `medium`, `high`)
5. Notes/PR links
