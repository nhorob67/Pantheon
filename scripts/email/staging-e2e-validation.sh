#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Run end-to-end AgentMail staging validation for Pantheon.

This script:
1) Replays a signed AgentMail webhook.
2) Invokes the inbound processor.
3) Optionally runs webhook idempotency duplicate check.

Required environment variables:
  APP_URL                   Base app URL (example: https://staging.pantheon.app)
  AGENTMAIL_WEBHOOK_SECRET  Secret for /api/webhooks/agentmail verification
  EMAIL_PROCESSOR_TOKEN     Token for /api/admin/email/process-inbound

Required arguments:
  --provider-email-id <id>  Real AgentMail message id
  --to-email <address>      Pantheon identity address (slug@pantheon.app)

Optional arguments:
  --inbox-id <id>           AgentMail inbox id
  --skip-idempotency        Skip duplicate webhook check
EOF
}

PROVIDER_EMAIL_ID=""
TO_EMAIL=""
INBOX_ID=""
RUN_IDEMPOTENCY=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider-email-id)
      PROVIDER_EMAIL_ID="${2:-}"
      shift 2
      ;;
    --to-email)
      TO_EMAIL="${2:-}"
      shift 2
      ;;
    --inbox-id)
      INBOX_ID="${2:-}"
      shift 2
      ;;
    --skip-idempotency)
      RUN_IDEMPOTENCY=0
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

: "${APP_URL:?APP_URL is required}"
: "${AGENTMAIL_WEBHOOK_SECRET:?AGENTMAIL_WEBHOOK_SECRET is required}"
: "${EMAIL_PROCESSOR_TOKEN:?EMAIL_PROCESSOR_TOKEN is required}"

if [[ -z "$PROVIDER_EMAIL_ID" ]]; then
  echo "--provider-email-id is required" >&2
  usage
  exit 1
fi

if [[ -z "$TO_EMAIL" ]]; then
  echo "--to-email is required" >&2
  usage
  exit 1
fi

echo "Running webhook replay + processor validation..."

if [[ -n "$INBOX_ID" ]]; then
  APP_URL="$APP_URL" \
  AGENTMAIL_WEBHOOK_SECRET="$AGENTMAIL_WEBHOOK_SECRET" \
  EMAIL_PROCESSOR_TOKEN="$EMAIL_PROCESSOR_TOKEN" \
  bash scripts/email/replay-agentmail-webhook.sh \
    --provider-email-id "$PROVIDER_EMAIL_ID" \
    --to-email "$TO_EMAIL" \
    --inbox-id "$INBOX_ID"
else
  APP_URL="$APP_URL" \
  AGENTMAIL_WEBHOOK_SECRET="$AGENTMAIL_WEBHOOK_SECRET" \
  EMAIL_PROCESSOR_TOKEN="$EMAIL_PROCESSOR_TOKEN" \
  bash scripts/email/replay-agentmail-webhook.sh \
    --provider-email-id "$PROVIDER_EMAIL_ID" \
    --to-email "$TO_EMAIL"
fi

if [[ "$RUN_IDEMPOTENCY" == "1" ]]; then
  echo "Running duplicate-event idempotency check..."
  APP_URL="$APP_URL" \
  AGENTMAIL_WEBHOOK_SECRET="$AGENTMAIL_WEBHOOK_SECRET" \
  TO_EMAIL="$TO_EMAIL" \
  bash scripts/email/verify-agentmail-webhook-idempotency.sh
fi

echo "Staging E2E validation complete."
