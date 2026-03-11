#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Trigger Pantheon memory operation processing (intended for scheduler/cron usage).

Required environment variables:
  APP_URL                  Base app URL (example: https://app.pantheon.app)
  MEMORY_PROCESSOR_TOKEN   Token for /api/admin/memory/process-operations auth

Optional environment variables:
  BATCH_SIZE               Processor batch size (default: 10)
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

: "${APP_URL:?APP_URL is required}"
: "${MEMORY_PROCESSOR_TOKEN:?MEMORY_PROCESSOR_TOKEN is required}"

BATCH_SIZE="${BATCH_SIZE:-10}"

RESPONSE="$(
  curl -sS -w '\n%{http_code}' \
    -X POST "${APP_URL%/}/api/admin/memory/process-operations" \
    -H "Authorization: Bearer ${MEMORY_PROCESSOR_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"batch_size\":${BATCH_SIZE}}"
)"

STATUS_CODE="$(printf '%s\n' "$RESPONSE" | tail -n1)"
BODY="$(printf '%s\n' "$RESPONSE" | sed '$d')"

echo "status=${STATUS_CODE} body=${BODY}"

if [[ "$STATUS_CODE" -lt 200 || "$STATUS_CODE" -gt 299 ]]; then
  echo "Memory processor invocation failed." >&2
  exit 1
fi
