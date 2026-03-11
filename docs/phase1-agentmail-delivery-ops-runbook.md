# Phase 1 Runbook: AgentMail Delivery + Inbound Domain Operations

This runbook covers the non-code delivery operations required before removing Resend ingress.

## Goals

1. Verify AgentMail domain setup for inbound + outbound.
2. Confirm SPF, DKIM, and DMARC posture for `pantheon.app`.
3. Register webhook events needed for Pantheon email lifecycle tracking.
4. Validate end-to-end ingest in staging and production.
5. Execute safe deprecation of Resend ingress after verification.

## Prerequisites

1. Migrations applied through:
   - `00011_email_phase1_agentmail.sql`
2. Runtime env configured:
   - `AGENTMAIL_API_KEY`
   - `AGENTMAIL_WEBHOOK_SECRET`
   - `AGENTMAIL_API_BASE_URL` (optional; default is used if omitted)
   - `EMAIL_PROCESSOR_TOKEN`
3. Processor scheduler configured:
   - `vercel.json` cron or external cron using `scripts/email/process-inbound-cron.sh`

## 1) Domain Verification (AgentMail Console)

1. Add sender domain in AgentMail for `pantheon.app`.
2. Add inbound routing domain/records as required by AgentMail.
3. Publish all DNS records exactly as provided by AgentMail.
4. Wait for AgentMail domain status to become verified.

## 2) SPF / DKIM / DMARC Validation

1. SPF:
   - Ensure exactly one TXT SPF policy is present for root domain.
   - Ensure AgentMail include/mechanism is present.
2. DKIM:
   - Publish AgentMail DKIM TXT/CNAME records.
   - Verify keys are active in AgentMail.
3. DMARC:
   - Ensure `_dmarc.pantheon.app` TXT exists.
   - Recommended minimum during rollout: `p=none` with reporting enabled.
   - Tighten policy after healthy delivery metrics.

## 3) Webhook Event Registration

Webhook URL:
1. Staging: `https://<staging-app-domain>/api/webhooks/agentmail`
2. Production: `https://<prod-app-domain>/api/webhooks/agentmail`

Required inbound event:
1. `message.received`

Recommended outbound/lifecycle events (for Phase IV logging readiness):
1. `message.accepted`
2. `message.delivered`
3. `message.bounced`
4. `message.complained`
5. `message.failed`

## 4) Validation Steps

1. Run staging replay and validation:
   - `docs/phase2-agentmail-staging-validation-runbook.md`
2. Confirm processor scheduler is executing regularly:
   - Logs show recurring successful processor calls.
3. Send at least 5 real inbound messages (with and without attachments).
4. Verify:
   - `email_webhook_events` rows inserted and marked `processed_at`.
   - `email_inbound.status` reaches `processed`.
   - `email_inbound_attachments` rows exist for attachment cases.

## 5) Resend Ingress Deprecation Gate

Do not remove Resend ingress until all are true:

1. AgentMail webhook success rate is stable in staging and production.
2. Processor handles AgentMail payloads without elevated failure retries.
3. No active inbound dependency on `provider='resend'`.
4. Operations team sign-off completed.

After gate passes:

1. Disable Resend webhook endpoint in provider dashboard.
2. Set `EMAIL_RESEND_INGRESS_ENABLED=false` in app env.
3. Remove Resend inbound docs and code paths per:
   - `plans/email-integration-implementation-plan.md` section "Code Removal / De-scope Map"
