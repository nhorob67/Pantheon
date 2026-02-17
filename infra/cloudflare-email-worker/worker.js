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

function buildForwardHeaders(message, localPart) {
  const headers = new Headers();
  headers.set("X-FarmClaw-Original-To", normalizeAddress(message.to));
  headers.set("X-FarmClaw-Original-From", normalizeAddress(message.from));
  headers.set("X-FarmClaw-Original-Localpart", localPart);
  headers.set("X-FarmClaw-Forwarded-At", new Date().toISOString());
  return headers;
}

const worker = {
  async email(message, env) {
    const rootDomain = normalizeAddress(env.ROOT_DOMAIN || "farmclaw.com");
    const forwardTo = normalizeAddress(env.FORWARD_TO);

    if (!forwardTo) {
      message.setReject("Routing destination is not configured");
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

    try {
      await message.forward(
        forwardTo,
        buildForwardHeaders(message, recipient.localPart)
      );
    } catch (error) {
      console.error("Forward failed", {
        to: recipient.normalized,
        from: sender,
        error: String(error),
      });
      message.setReject("Temporary mail routing failure");
    }
  },
};

export default worker;
