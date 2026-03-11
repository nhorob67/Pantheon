# Phase 2 Runbook: Inbound Email Processor

This runbook covers the Phase 2 processor that turns `email_inbound` rows from
`queued/failed` into `processed/failed`, persists raw payloads, and stores
attachment binaries in Supabase Storage.

Providers currently supported by the processor:
1. `agentmail` (primary path)
2. `resend` (transitional fallback during migration)

## Prerequisites

1. Supabase migrations applied:
   - `00010_email_phase2_processing.sql`
   - `00011_email_phase1_agentmail.sql` (for provider mailbox metadata)
2. App env vars set:
   - `AGENTMAIL_API_KEY` (required for processing `provider='agentmail'` rows)
   - `AGENTMAIL_API_BASE_URL` (optional; defaults to AgentMail API base URL)
   - `RESEND_API_KEY` (required only if processing `provider='resend'` rows)
   - `EMAIL_RESEND_INGRESS_ENABLED` (optional; set `false` once AgentMail cutover is complete)
   - `EMAIL_PROCESSOR_TOKEN` (recommended for scheduler calls)
   - `CRON_SECRET` (optional; required if using Vercel Cron auth)
   - `EMAIL_MAX_ATTACHMENT_BYTES` (optional; defaults to `26214400` / 25 MB)
3. Phase 1 routing is already working (rows are being inserted into `email_inbound`).

For staged AgentMail integration validation, use:
- `docs/phase2-agentmail-staging-validation-runbook.md`

For webhook idempotency-only validation, use:
- `scripts/email/verify-agentmail-webhook-idempotency.sh`

## Endpoint

- `POST /api/admin/email/process-inbound`
- `GET /api/admin/email/process-inbound` (for cron providers that only support GET)

Request body (optional):

```json
{
  "batch_size": 10,
  "max_retries": 5
}
```

Auth options:

1. Admin web session (email in `ADMIN_EMAILS`)
2. Header token:
   - `Authorization: Bearer <EMAIL_PROCESSOR_TOKEN>`
   - or `x-email-processor-token: <EMAIL_PROCESSOR_TOKEN>`

## Scheduler Example

Call every minute (recommended initial cadence):

```bash
curl -sS -X POST "https://<your-app-domain>/api/admin/email/process-inbound" \
  -H "Authorization: Bearer $EMAIL_PROCESSOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batch_size":10,"max_retries":5}'
```

## Scheduler Configuration

### Option A: Vercel Cron

`vercel.json` defines a 1-minute cron for:
- `GET /api/admin/email/process-inbound`

Required env:
1. `CRON_SECRET` in Vercel project settings.
2. Optional but recommended: keep `EMAIL_PROCESSOR_TOKEN` set for manual/API invocations.

### Option B: External Cron (Coolify server/system cron)

Use:
- `scripts/email/process-inbound-cron.sh`

Example crontab entry (every minute):

```cron
* * * * * APP_URL=https://<your-app-domain> EMAIL_PROCESSOR_TOKEN=<token> /bin/bash /path/to/repo/scripts/email/process-inbound-cron.sh >> /var/log/pantheon-email-processor.log 2>&1
```

## Expected Outcomes

1. `email_inbound.status` transitions:
   - `queued` -> `processing` -> `processed` (success)
   - `queued` -> `processing` -> `failed` (error)
2. Raw payload stored in bucket `email-raw`.
3. Attachments stored in bucket `email-attachments`.
4. Attachment metadata written to `email_inbound_attachments`.

## Failure + Retry Behavior

1. On failure, `retry_count` increments and `next_attempt_at` is set with exponential backoff.
2. Rows remain eligible for retry until `retry_count >= max_retries`.
3. When retry cap is hit, row remains `failed` and is marked as poison in metadata.

## Hardening Notes

1. Processor token checks now use constant-time comparison for header token auth.
2. Base64 attachment payloads are validated before decode.
3. Attachments exceeding `EMAIL_MAX_ATTACHMENT_BYTES` fail safely and enter retry flow.
