#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to run this script." >&2
  exit 1
fi

usage() {
  cat <<'EOF'
Replay an AgentMail-style signed webhook to FarmClaw and optionally trigger the Phase 2 processor.

Required environment variables:
  APP_URL                   Base app URL (example: https://staging.farmclaw.com)
  AGENTMAIL_WEBHOOK_SECRET  Webhook secret used by /api/webhooks/agentmail

Required arguments:
  --provider-email-id <id>  Real AgentMail message id (must exist for processor success)
  --to-email <address>      FarmClaw identity address (slug@farmclaw.com)

Optional arguments:
  --inbox-id <id>           AgentMail inbox id (improves identity matching)
  --from-email <address>    Sender address used in payload (default: staging-sender@example.net)
  --subject <text>          Message subject (default: FarmClaw AgentMail staging replay)
  --batch-size <n>          Processor batch size (default: 10)
  --max-retries <n>         Processor max retries (default: 5)
  --skip-processor          Only send webhook; do not call processor endpoint

Processor call requirements:
  EMAIL_PROCESSOR_TOKEN     Required unless --skip-processor is set
EOF
}

PROVIDER_EMAIL_ID=""
TO_EMAIL=""
INBOX_ID=""
FROM_EMAIL="staging-sender@example.net"
SUBJECT="FarmClaw AgentMail staging replay"
RUN_PROCESSOR=1
BATCH_SIZE=10
MAX_RETRIES=5

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
    --from-email)
      FROM_EMAIL="${2:-}"
      shift 2
      ;;
    --subject)
      SUBJECT="${2:-}"
      shift 2
      ;;
    --batch-size)
      BATCH_SIZE="${2:-}"
      shift 2
      ;;
    --max-retries)
      MAX_RETRIES="${2:-}"
      shift 2
      ;;
    --skip-processor)
      RUN_PROCESSOR=0
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

if [[ "$RUN_PROCESSOR" == "1" ]]; then
  : "${EMAIL_PROCESSOR_TOKEN:?EMAIL_PROCESSOR_TOKEN is required unless --skip-processor is set}"
fi

PAYLOAD_FILE="$(mktemp)"
cleanup() {
  rm -f "$PAYLOAD_FILE"
}
trap cleanup EXIT

export PROVIDER_EMAIL_ID TO_EMAIL INBOX_ID FROM_EMAIL SUBJECT PAYLOAD_FILE

node - <<'NODE'
const fs = require("node:fs");

const payload = {
  type: "message.received",
  createdAt: new Date().toISOString(),
  data: {
    id: process.env.PROVIDER_EMAIL_ID,
    inbox_id: process.env.INBOX_ID || null,
    from: process.env.FROM_EMAIL,
    to: [process.env.TO_EMAIL],
    subject: process.env.SUBJECT,
    message_id: `<${process.env.PROVIDER_EMAIL_ID}@agentmail.staging>`,
    attachments_count: 0,
    headers: {
      "x-farmclaw-original-to": process.env.TO_EMAIL,
    },
  },
};

fs.writeFileSync(process.env.PAYLOAD_FILE, JSON.stringify(payload), "utf8");
NODE

SVIX_ID="replay-$(date +%s)-$RANDOM"
SVIX_TIMESTAMP="$(date +%s)"

SVIX_SIGNATURE="$(
  node - "$AGENTMAIL_WEBHOOK_SECRET" "$SVIX_ID" "$SVIX_TIMESTAMP" "$PAYLOAD_FILE" <<'NODE'
const crypto = require("node:crypto");
const fs = require("node:fs");

const [secret, id, timestamp, payloadPath] = process.argv.slice(2);
const payload = fs.readFileSync(payloadPath, "utf8");

const trimmed = secret.trim();
const encoded = trimmed.startsWith("whsec_") ? trimmed.slice(6) : trimmed;
const decoded = Buffer.from(encoded, "base64");
const key = decoded.length > 0 ? decoded : Buffer.from(trimmed, "utf8");
const signedPayload = `${id}.${timestamp}.${payload}`;
const digest = crypto.createHmac("sha256", key).update(signedPayload).digest("base64");

process.stdout.write(`v1,${digest}`);
NODE
)"

echo "Replaying webhook to ${APP_URL}/api/webhooks/agentmail"
WEBHOOK_RESPONSE="$(
  curl -sS -w '\n%{http_code}' \
    -X POST "${APP_URL%/}/api/webhooks/agentmail" \
    -H "Content-Type: application/json" \
    -H "svix-id: ${SVIX_ID}" \
    -H "svix-timestamp: ${SVIX_TIMESTAMP}" \
    -H "svix-signature: ${SVIX_SIGNATURE}" \
    --data-binary "@${PAYLOAD_FILE}"
)"

WEBHOOK_CODE="$(printf '%s\n' "$WEBHOOK_RESPONSE" | tail -n1)"
WEBHOOK_BODY="$(printf '%s\n' "$WEBHOOK_RESPONSE" | sed '$d')"

echo "Webhook status: ${WEBHOOK_CODE}"
echo "Webhook body: ${WEBHOOK_BODY}"

if [[ "$WEBHOOK_CODE" -lt 200 || "$WEBHOOK_CODE" -gt 299 ]]; then
  echo "Webhook replay failed." >&2
  exit 1
fi

if [[ "$RUN_PROCESSOR" == "0" ]]; then
  echo "Skipping processor call."
  exit 0
fi

echo "Calling processor at ${APP_URL}/api/admin/email/process-inbound"
PROCESSOR_RESPONSE="$(
  curl -sS -w '\n%{http_code}' \
    -X POST "${APP_URL%/}/api/admin/email/process-inbound" \
    -H "Authorization: Bearer ${EMAIL_PROCESSOR_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"batch_size\":${BATCH_SIZE},\"max_retries\":${MAX_RETRIES}}"
)"

PROCESSOR_CODE="$(printf '%s\n' "$PROCESSOR_RESPONSE" | tail -n1)"
PROCESSOR_BODY="$(printf '%s\n' "$PROCESSOR_RESPONSE" | sed '$d')"

echo "Processor status: ${PROCESSOR_CODE}"
echo "Processor body: ${PROCESSOR_BODY}"

if [[ "$PROCESSOR_CODE" -lt 200 || "$PROCESSOR_CODE" -gt 299 ]]; then
  echo "Processor call failed." >&2
  exit 1
fi

echo "Replay complete."
