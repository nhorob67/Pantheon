import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value.trim(), "utf8").digest();
}

export function constantTimeTokenEquals(
  providedToken: string,
  expectedToken: string
): boolean {
  if (!providedToken || !expectedToken) {
    return false;
  }

  const providedDigest = digest(providedToken);
  const expectedDigest = digest(expectedToken);
  return timingSafeEqual(providedDigest, expectedDigest);
}

export function constantTimeTokenInSet(
  providedToken: string,
  expectedTokens: string[]
): boolean {
  if (!providedToken || expectedTokens.length === 0) {
    return false;
  }

  let found = false;
  for (const expectedToken of expectedTokens) {
    if (constantTimeTokenEquals(providedToken, expectedToken)) {
      found = true;
    }
  }
  return found;
}
