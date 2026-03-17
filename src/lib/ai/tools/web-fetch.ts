import { tool } from "ai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_LENGTH = 16_000;
const MAX_URL_LENGTH = 2_048;

/**
 * MIME types we accept for content extraction.
 * Binary/media formats are rejected to keep context window clean.
 */
const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "application/json",
  "application/xml",
  "text/xml",
  "text/csv",
  "text/markdown",
  "application/rss+xml",
  "application/atom+xml",
];

// ---------------------------------------------------------------------------
// SSRF protection (shared with http-request.ts)
// ---------------------------------------------------------------------------

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
];

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(lower)) return true;
  if (lower.endsWith(".internal") || lower.endsWith(".local")) return true;
  if (/^10\./.test(lower) || /^172\.(1[6-9]|2\d|3[01])\./.test(lower) || /^192\.168\./.test(lower)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// HTML → text extraction (lightweight, no heavy deps)
// ---------------------------------------------------------------------------

/**
 * Naive HTML-to-text extraction. Strips tags, decodes common entities,
 * collapses whitespace, and extracts a readable text body.
 *
 * For v1 this is intentionally simple — a production upgrade would use
 * a readability algorithm or a dedicated extraction service.
 */
function extractTextFromHtml(html: string): string {
  let text = html;
  // Remove script/style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  // Convert block elements to newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|section|article|header|footer|nav|aside|main|pre|hr)[^>]*>/gi, "\n");
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Extract the page title from an HTML document.
 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() || null;
}

/**
 * Extract meta description from an HTML document.
 */
function extractMetaDescription(html: string): string | null {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i)
    ?? html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i);
  if (!match) return null;
  return match[1].trim() || null;
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

/**
 * Creates the `web_fetch` tool for fetching and extracting content from public URLs.
 *
 * Unlike `http_request`, this tool:
 * - Is for **public, unauthenticated** content retrieval (no credential injection)
 * - Extracts readable text from HTML pages (strips tags, scripts, styles)
 * - Enforces content-type filtering (rejects binary/media)
 * - Provides provenance metadata (title, description, fetched timestamp)
 *
 * For authenticated API calls, agents should use `http_request` instead.
 */
export function createWebFetchTool() {
  return {
    web_fetch: tool({
      description:
        "Fetch and extract content from a public URL. Returns readable text extracted from " +
        "the page, plus metadata like title and description. Use this for reading web pages, " +
        "articles, documentation, or any public content found via web_search. " +
        "For authenticated API calls, use http_request instead. " +
        "Only HTTPS URLs are allowed. Binary files (images, PDFs, etc.) are not supported.",
      inputSchema: z.object({
        url: z
          .string()
          .max(MAX_URL_LENGTH)
          .describe("The URL to fetch (must be HTTPS)"),
        extract_mode: z
          .enum(["text", "raw"])
          .default("text")
          .describe(
            "'text' (default): extract readable text from HTML. " +
            "'raw': return the raw response body as-is (useful for JSON/XML/CSV APIs)."
          ),
        max_length: z
          .number()
          .int()
          .min(500)
          .max(MAX_BODY_LENGTH)
          .default(MAX_BODY_LENGTH)
          .describe(`Maximum characters to return (default ${MAX_BODY_LENGTH})`),
      }),
      execute: async ({ url, extract_mode, max_length }) => {
        // ----- URL validation -----
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(url);
        } catch {
          return { error: "Invalid URL format." };
        }

        if (parsedUrl.protocol !== "https:") {
          return { error: "Only HTTPS URLs are allowed. Use https:// instead." };
        }

        if (isBlockedHost(parsedUrl.hostname)) {
          return { error: "Requests to internal/private networks are not allowed." };
        }

        // ----- Fetch -----
        try {
          const response = await fetch(parsedUrl.toString(), {
            method: "GET",
            headers: {
              "User-Agent": "Pantheon/1.0 (web-fetch)",
              Accept: "text/html, application/json, text/plain, */*;q=0.5",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          });

          if (!response.ok) {
            return {
              error: `Fetch failed with HTTP ${response.status} ${response.statusText}`,
              status: response.status,
              url: parsedUrl.toString(),
            };
          }

          // ----- Content-type filtering -----
          const contentType = response.headers.get("content-type") ?? "";
          const mimeType = contentType.split(";")[0].trim().toLowerCase();
          const isAllowed = ALLOWED_CONTENT_TYPES.some((t) => mimeType.startsWith(t));

          if (!isAllowed && mimeType) {
            return {
              error: `Content type "${mimeType}" is not supported. web_fetch works with text/HTML/JSON/XML content only.`,
              url: parsedUrl.toString(),
              content_type: mimeType,
            };
          }

          // ----- Body extraction -----
          let rawBody = await response.text();

          // Hard cap on raw body to prevent memory issues
          if (rawBody.length > MAX_BODY_LENGTH * 2) {
            rawBody = rawBody.slice(0, MAX_BODY_LENGTH * 2);
          }

          const isHtml = mimeType.includes("html") || rawBody.trimStart().startsWith("<!") || rawBody.trimStart().startsWith("<html");

          let content: string;
          let title: string | null = null;
          let description: string | null = null;

          if (extract_mode === "text" && isHtml) {
            title = extractTitle(rawBody);
            description = extractMetaDescription(rawBody);
            content = extractTextFromHtml(rawBody);
          } else {
            content = rawBody;
          }

          // Truncate to requested max length
          let truncated = false;
          if (content.length > max_length) {
            content = content.slice(0, max_length) + "\n[...truncated]";
            truncated = true;
          }

          return {
            url: parsedUrl.toString(),
            title,
            description,
            content,
            content_type: mimeType,
            content_length: content.length,
            truncated,
            fetched_at: new Date().toISOString(),
          };
        } catch (err) {
          if (err instanceof Error) {
            if (err.name === "AbortError" || err.name === "TimeoutError") {
              return { error: "Request timed out (15 second limit).", url: parsedUrl.toString() };
            }
            return { error: `Fetch failed: ${err.message}`, url: parsedUrl.toString() };
          }
          return { error: "Fetch failed", url: parsedUrl.toString() };
        }
      },
    }),
  };
}
