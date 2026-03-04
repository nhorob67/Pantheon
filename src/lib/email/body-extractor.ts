import type { SupabaseClient } from "@supabase/supabase-js";
import { simpleParser } from "mailparser";

/**
 * Download source.json from the email-raw storage bucket and extract
 * the plain-text body from the email payload.
 */
export async function extractEmailBody(
  admin: SupabaseClient,
  storagePath: string
): Promise<string> {
  const { data, error } = await admin.storage
    .from("email-raw")
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download raw email: ${error?.message || "no data"}`);
  }

  const text = await data.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Failed to parse raw email JSON");
  }

  return extractBodyFromPayload(payload);
}

async function extractBodyFromPayload(
  payload: Record<string, unknown>
): Promise<string> {
  // Detect provider format and extract accordingly
  const data = (payload.data || payload) as Record<string, unknown>;

  // Cloudflare provider: base64-encoded RFC 822 raw_email
  if (typeof data.raw_email === "string") {
    return parseRfc822Body(data.raw_email);
  }

  // AgentMail provider: nested body object or direct text
  if (data.body && typeof data.body === "object") {
    const body = data.body as Record<string, unknown>;
    if (typeof body.text === "string") return body.text;
    if (typeof body.html === "string") return stripHtml(body.html);
  }

  // Direct text field (Resend, AgentMail flat)
  if (typeof data.text === "string") return data.text;
  if (typeof payload.text === "string") return payload.text;

  // Fallback: try html
  if (typeof data.html === "string") return stripHtml(data.html);
  if (typeof payload.html === "string") return stripHtml(payload.html);

  return "";
}

/**
 * Parse a base64-encoded RFC 822 email and extract the text body using mailparser.
 */
async function parseRfc822Body(base64Raw: string): Promise<string> {
  const buffer = Buffer.from(base64Raw, "base64");
  const parsed = await simpleParser(buffer);
  return parsed.text || (parsed.html ? stripHtml(parsed.html) : "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
