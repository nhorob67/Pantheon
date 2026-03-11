# Phase 2 AgentMail Staging Validation Runbook

This runbook validates the hybrid ingestion flow end-to-end in staging:

1. AgentMail `message.received` webhook lands in Pantheon.
2. Pantheon writes `email_inbound` row in `queued`.
3. Phase 2 processor transitions message to `processed`.
4. Raw payload and attachments persist in Supabase Storage.

## Prerequisites

1. Migrations applied:
   - `00010_email_phase2_processing.sql`
   - `00011_email_phase1_agentmail.sql`
2. Runtime env set in staging:
   - `AGENTMAIL_API_KEY`
   - `AGENTMAIL_WEBHOOK_SECRET`
   - `AGENTMAIL_API_BASE_URL` (or default)
   - `EMAIL_PROCESSOR_TOKEN`
3. At least one customer enabled email in `/settings/email` and has active identity:
   - `email_identities.provider = 'agentmail'`
   - `email_identities.provider_mailbox_id IS NOT NULL`
4. AgentMail webhook configured to:
   - URL: `https://<staging-app-domain>/api/webhooks/agentmail`
   - Event: `message.received`

## Option A: Real Email Validation (Recommended)

1. Send a real email from external sender to the Pantheon identity address.
2. Wait for AgentMail event delivery.
3. Run SQL checks in Supabase (queries below).
4. Invoke processor endpoint.
5. Confirm message moved to `processed` and storage artifacts exist.

## Option B: Webhook Replay Script

Use this for deterministic replay once you have a real AgentMail message id.

```bash
APP_URL="https://<staging-app-domain>" \
AGENTMAIL_WEBHOOK_SECRET="<whsec_...>" \
EMAIL_PROCESSOR_TOKEN="<token>" \
bash scripts/email/replay-agentmail-webhook.sh \
  --provider-email-id "<agentmail_message_id>" \
  --to-email "<slug@pantheon.app>" \
  --inbox-id "<agentmail_inbox_id>"
```

Notes:
1. `--provider-email-id` should be a real message id stored by AgentMail.
2. If you only want to validate queue insert, add `--skip-processor`.

## Option C: One-Command E2E Validation

Use this wrapper to run replay + processor + optional idempotency checks:

```bash
APP_URL="https://<staging-app-domain>" \
AGENTMAIL_WEBHOOK_SECRET="<whsec_...>" \
EMAIL_PROCESSOR_TOKEN="<token>" \
bash scripts/email/staging-e2e-validation.sh \
  --provider-email-id "<agentmail_message_id>" \
  --to-email "<slug@pantheon.app>" \
  --inbox-id "<agentmail_inbox_id>"
```

## Idempotency Verification (No Provider Fetch Required)

Use this to verify duplicate-event handling in webhook ingestion by replaying the
same `svix-id` twice and asserting the second response returns `duplicate=true`.

```bash
APP_URL="https://<staging-app-domain>" \
AGENTMAIL_WEBHOOK_SECRET="<whsec_...>" \
bash scripts/email/verify-agentmail-webhook-idempotency.sh
```

Notes:
1. This check does not require a valid AgentMail API key.
2. Default recipient is intentionally unknown so it validates webhook dedupe
   without creating processed inbound workload.

## SQL Checks (Supabase SQL Editor)

Check webhook event:

```sql
select provider, provider_event_id, event_type, received_at, processed_at
from email_webhook_events
where provider = 'agentmail'
order by received_at desc
limit 20;
```

Check inbound queue and processing outcome:

```sql
select
  id,
  provider,
  provider_email_id,
  status,
  retry_count,
  last_error,
  raw_storage_bucket,
  raw_storage_path,
  received_at,
  processed_at,
  failed_at
from email_inbound
where provider = 'agentmail'
order by received_at desc
limit 20;
```

Check attachment rows:

```sql
select
  inbound_id,
  filename,
  mime_type,
  size_bytes,
  storage_bucket,
  storage_path,
  created_at
from email_inbound_attachments
where provider = 'agentmail'
order by created_at desc
limit 50;
```

Check identity linkage:

```sql
select
  id,
  customer_id,
  address,
  provider,
  provider_mailbox_id,
  is_active,
  updated_at
from email_identities
where is_active = true
order by updated_at desc
limit 20;
```

## Processor Invocation

```bash
curl -sS -X POST "https://<staging-app-domain>/api/admin/email/process-inbound" \
  -H "Authorization: Bearer <EMAIL_PROCESSOR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"batch_size":10,"max_retries":5}'
```

## Success Criteria

1. `email_webhook_events` row is inserted and then marked `processed_at`.
2. `email_inbound` row transitions to `processed` with no `last_error`.
3. Raw payload path is populated (`raw_storage_bucket=email-raw`).
4. Attachments (if present) are stored and metadata rows exist in `email_inbound_attachments`.
5. No unexpected retries (`retry_count` stable for success case).

## Failure Triage

1. Webhook 400 signature error:
   - Verify `AGENTMAIL_WEBHOOK_SECRET` exactly matches webhook config.
2. `ignored_unknown_recipient`:
   - Identity not linked or recipient mismatch.
   - Confirm `email_identities.address` and `provider_mailbox_id`.
3. Processor `failed` with provider fetch error:
   - Verify `AGENTMAIL_API_KEY` and API base URL.
   - Confirm message id still exists in AgentMail.
4. Processor authorization failure:
   - Check `EMAIL_PROCESSOR_TOKEN` or admin auth session.
