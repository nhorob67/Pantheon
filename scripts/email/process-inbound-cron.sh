#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Trigger Pantheon inbound email processing (intended for scheduler/cron usage).

Required environment variables:
  APP_URL                 Base app URL (example: https://app.pantheon.app)
  EMAIL_PROCESSOR_TOKEN   Token for /api/admin/email/process-inbound auth

Optional environment variables:
  BATCH_SIZE              Processor batch size (default: 10)
  MAX_RETRIES             Max retries per message (default: 5)
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

: "${APP_URL:?APP_URL is required}"
: "${EMAIL_PROCESSOR_TOKEN:?EMAIL_PROCESSOR_TOKEN is required}"

BATCH_SIZE="${BATCH_SIZE:-10}"
MAX_RETRIES="${MAX_RETRIES:-5}"

RESPONSE="$(
  curl -sS -w '\n%{http_code}' \
    -X POST "${APP_URL%/}/api/admin/email/process-inbound" \
    -H "Authorization: Bearer ${EMAIL_PROCESSOR_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"batch_size\":${BATCH_SIZE},\"max_retries\":${MAX_RETRIES}}"
)"

STATUS_CODE="$(printf '%s\n' "$RESPONSE" | tail -n1)"
BODY="$(printf '%s\n' "$RESPONSE" | sed '$d')"

echo "status=${STATUS_CODE} body=${BODY}"

if [[ "$STATUS_CODE" -lt 200 || "$STATUS_CODE" -gt 299 ]]; then
  echo "Processor invocation failed." >&2
  exit 1
fi
