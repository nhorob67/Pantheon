#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Send the same AgentMail-style webhook twice and verify duplicate-event idempotency.

Required environment variables:
  APP_URL                   Base app URL (example: https://staging.farmclaw.com)
  AGENTMAIL_WEBHOOK_SECRET  Webhook secret configured for /api/webhooks/agentmail

Optional:
  TO_EMAIL                  Recipient used in payload (default is intentionally unknown)
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

: "${APP_URL:?APP_URL is required}"
: "${AGENTMAIL_WEBHOOK_SECRET:?AGENTMAIL_WEBHOOK_SECRET is required}"

TO_EMAIL="${TO_EMAIL:-unknown-$(date +%s)-$RANDOM@farmclaw.com}"
PROVIDER_EMAIL_ID="idem-$(date +%s)-$RANDOM"
SVIX_ID="idempotency-$(date +%s)-$RANDOM"
SVIX_TIMESTAMP="$(date +%s)"

PAYLOAD_FILE="$(mktemp)"
cleanup() {
  rm -f "$PAYLOAD_FILE"
}
trap cleanup EXIT

export PROVIDER_EMAIL_ID TO_EMAIL PAYLOAD_FILE

node - <<'NODE'
const fs = require("node:fs");

const payload = {
  type: "message.received",
  createdAt: new Date().toISOString(),
  data: {
    id: process.env.PROVIDER_EMAIL_ID,
    from: "idempotency-check@example.net",
    to: [process.env.TO_EMAIL],
    subject: "FarmClaw webhook idempotency validation",
    message_id: `<${process.env.PROVIDER_EMAIL_ID}@agentmail.test>`,
    attachments_count: 0,
    headers: {
      "x-farmclaw-original-to": process.env.TO_EMAIL,
    },
  },
};

fs.writeFileSync(process.env.PAYLOAD_FILE, JSON.stringify(payload), "utf8");
NODE

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

send_webhook() {
  curl -sS -w '\n%{http_code}' \
    -X POST "${APP_URL%/}/api/webhooks/agentmail" \
    -H "Content-Type: application/json" \
    -H "svix-id: ${SVIX_ID}" \
    -H "svix-timestamp: ${SVIX_TIMESTAMP}" \
    -H "svix-signature: ${SVIX_SIGNATURE}" \
    --data-binary "@${PAYLOAD_FILE}"
}

echo "Sending first webhook request..."
FIRST_RESPONSE="$(send_webhook)"
FIRST_CODE="$(printf '%s\n' "$FIRST_RESPONSE" | tail -n1)"
FIRST_BODY="$(printf '%s\n' "$FIRST_RESPONSE" | sed '$d')"
echo "First status: ${FIRST_CODE}"
echo "First body: ${FIRST_BODY}"

if [[ "$FIRST_CODE" -lt 200 || "$FIRST_CODE" -gt 299 ]]; then
  echo "First webhook request failed." >&2
  exit 1
fi

echo "Sending duplicate webhook request..."
SECOND_RESPONSE="$(send_webhook)"
SECOND_CODE="$(printf '%s\n' "$SECOND_RESPONSE" | tail -n1)"
SECOND_BODY="$(printf '%s\n' "$SECOND_RESPONSE" | sed '$d')"
echo "Second status: ${SECOND_CODE}"
echo "Second body: ${SECOND_BODY}"

if [[ "$SECOND_CODE" -lt 200 || "$SECOND_CODE" -gt 299 ]]; then
  echo "Duplicate webhook request failed." >&2
  exit 1
fi

IS_DUPLICATE="$(
  node -e '
    try {
      const body = JSON.parse(process.argv[1]);
      process.stdout.write(String(Boolean(body.duplicate)));
    } catch {
      process.stdout.write("false");
    }
  ' "$SECOND_BODY"
)"

if [[ "$IS_DUPLICATE" != "true" ]]; then
  echo "Expected duplicate=true on second request, got: ${SECOND_BODY}" >&2
  exit 1
fi

echo "Idempotency check passed."
