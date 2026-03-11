const RESERVED_LOCAL_PARTS = new Set([
  "postmaster",
  "abuse",
  "mailer-daemon",
]);

function normalizeAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function parseAddressParts(address) {
  const normalized = normalizeAddress(address);
  const [localPart, domain] = normalized.split("@");
  return {
    localPart: localPart || "",
    domain: domain || "",
    normalized,
  };
}

function parseBlockedSenders(raw) {
  return new Set(
    String(raw || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function signPayload(payload, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function parseHeaders(message) {
  const headers = {};
  for (const [key, value] of message.headers) {
    headers[key.toLowerCase()] = value;
  }
  return headers;
}

const worker = {
  async email(message, env) {
    const rootDomain = normalizeAddress(env.ROOT_DOMAIN || "pantheon.app");
    const webhookUrl = env.WEBHOOK_URL;
    const webhookSecret = env.WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      message.setReject("Webhook destination is not configured");
      return;
    }

    const recipient = parseAddressParts(message.to);
    if (!recipient.localPart || !recipient.domain) {
      message.setReject("Invalid recipient address");
      return;
    }

    if (recipient.domain !== rootDomain) {
      message.setReject("Recipient domain is not allowed");
      return;
    }

    if (RESERVED_LOCAL_PARTS.has(recipient.localPart)) {
      message.setReject("Recipient is reserved");
      return;
    }

    const blockedSenders = parseBlockedSenders(env.BLOCKED_SENDERS);
    const sender = normalizeAddress(message.from);
    if (blockedSenders.has(sender)) {
      message.setReject("Sender is blocked");
      return;
    }

    // Read the raw email body
    const rawEmail = await new Response(message.raw).arrayBuffer();
    const rawEmailBase64 = btoa(
      String.fromCharCode(...new Uint8Array(rawEmail))
    );

    const eventId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const headers = parseHeaders(message);

    const payload = JSON.stringify({
      event_id: eventId,
      type: "email.received",
      timestamp,
      data: {
        to: recipient.normalized,
        from: sender,
        local_part: recipient.localPart,
        subject: headers["subject"] || null,
        message_id: headers["message-id"] || null,
        headers,
        raw_email: rawEmailBase64,
      },
    });

    const signature = await signPayload(`${eventId}.${timestamp}.${payload}`, webhookSecret);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pantheon-Signature": `v1,${signature}`,
          "X-Pantheon-Event-Id": eventId,
          "X-Pantheon-Timestamp": timestamp,
        },
        body: payload,
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Webhook delivery failed", {
          status: response.status,
          body: text.slice(0, 200),
          to: recipient.normalized,
          from: sender,
        });
        message.setReject("Temporary mail processing failure");
      }
    } catch (error) {
      console.error("Webhook request failed", {
        to: recipient.normalized,
        from: sender,
        error: String(error),
      });
      message.setReject("Temporary mail routing failure");
    }
  },
};

export default worker;
