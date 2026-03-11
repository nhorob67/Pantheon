# Phase 1 Runbook: Cloudflare Email Routing + Resend Receiving (Deprecated)

This runbook is legacy and kept only for rollback reference during migration.

Use these runbooks for active operations:
1. `docs/phase1-agentmail-delivery-ops-runbook.md`
2. `docs/phase2-agentmail-staging-validation-runbook.md`
3. `docs/phase2-email-processor-runbook.md`

This runbook deploys the Phase 1 infrastructure for per-account addresses like `my-farm@pantheon.app`.

## Architecture

1. Root domain `pantheon.app` receives inbound mail at Cloudflare.
2. Cloudflare Email Routing catch-all sends mail to an Email Worker.
3. Worker forwards to one verified ingress destination (`ingress@inbound.pantheon.app`) and stamps `X-Pantheon-*` headers.
4. Resend Receiving on `inbound.pantheon.app` triggers Pantheon webhook (`/api/webhooks/resend`).
5. Pantheon stores a queued inbound row in Supabase (`email_inbound`).

## Prerequisites

1. Cloudflare manages DNS for `pantheon.app`.
2. Resend account with receiving access enabled.
3. Pantheon app deployed with:
   - `RESEND_WEBHOOK_SECRET`
   - `PANTHEON_EMAIL_DOMAIN=pantheon.app`
4. Supabase migrations applied:
   - `00008_email_phase1.sql`
   - `00009_email_webhook_observability.sql`

## 1) Configure Resend Receiving Subdomain

1. In Resend, add receiving domain: `inbound.pantheon.app`.
2. Create required DNS records in Cloudflare exactly as Resend provides (MX/TXT).
3. In Resend, add webhook endpoint:
   - URL: `https://<your-app-domain>/api/webhooks/resend`
   - Events: `email.received`
4. Copy webhook secret from Resend and set:
   - `RESEND_WEBHOOK_SECRET`

## 2) Create Cloudflare Email Worker

Files are in `infra/cloudflare-email-worker/`.

1. Copy config:
```bash
cd infra/cloudflare-email-worker
cp wrangler.toml.example wrangler.toml
```

2. Authenticate Wrangler:
```bash
npx wrangler login
```

3. Deploy:
```bash
npx wrangler deploy
```

Worker behavior:
1. Accepts root-domain recipients only (`ROOT_DOMAIN`).
2. Rejects reserved local-parts (`postmaster`, `abuse`, `mailer-daemon`).
3. Forwards all accepted mail to `FORWARD_TO`.
4. Adds:
   - `X-Pantheon-Original-To`
   - `X-Pantheon-Original-From`
   - `X-Pantheon-Original-Localpart`
   - `X-Pantheon-Forwarded-At`

## 3) Verify Cloudflare Forward Destination

Cloudflare Email Worker `message.forward(...)` requires a verified destination address.

1. In Cloudflare Email Routing, add destination address:
   - `ingress@inbound.pantheon.app`
2. Cloudflare sends a verification email.
3. Open that email in Resend received-email view for `inbound.pantheon.app`.
4. Click the verification link/code from that email.
5. Confirm destination status is `Verified` in Cloudflare.

## 4) Bind Catch-All Rule to Worker

1. In Cloudflare Email Routing for `pantheon.app`, create a catch-all custom address:
   - `*@pantheon.app`
2. Action:
   - Send to Email Worker `pantheon-email-router`
3. Ensure no higher-priority rule bypasses the worker.

## 5) App Environment

Set these in Pantheon runtime:

1. `PANTHEON_EMAIL_DOMAIN=pantheon.app`
2. `RESEND_WEBHOOK_SECRET=<from Resend webhook>`
3. Optional:
   - `RESEND_API_KEY=<for later processing phases>`

## 6) End-to-End Validation

1. In Pantheon app, open settings:
   - `/settings/email`
2. Confirm account address exists (for example `my-farm@pantheon.app`).
3. Send a test email from an external address to that account address.
4. Watch worker logs:
```bash
cd infra/cloudflare-email-worker
npx wrangler tail
```
5. Confirm DB records:
   - `email_webhook_events` contains `provider='resend'`
   - `email_inbound` contains a `status='queued'` row for the customer
   - `email_webhook_counters` increments outcome rows (for example `queued`)

## 7) Troubleshooting

1. `Webhook verification failed`:
   - Wrong `RESEND_WEBHOOK_SECRET`.
2. `unknown_recipient` in webhook response:
   - Account slug/address mismatch in `email_identities`.
   - Worker not forwarding original-to context (check headers).
3. No messages reaching Resend:
   - `FORWARD_TO` destination not verified in Cloudflare.
   - Catch-all rule not attached to worker.
4. Build/test in local sandbox:
   - Network-restricted environments may fail external checks (DNS/provider API).

## 8) Rollback

1. Disable catch-all worker rule in Cloudflare.
2. Keep webhook endpoint live (safe, idempotent).
3. Re-enable once destination verification/routing is corrected.
