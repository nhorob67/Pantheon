const DOCS_ASK_WINDOW_SECONDS = 60;
const DOCS_ASK_MAX_ATTEMPTS = 10;
const OPENROUTER_TIMEOUT_MS = 25_000;
const MAX_CONTEXT_CHARS = 12_000;
const MAX_CHUNKS = 8;
const MAX_CHUNK_CHARS = 1_100;

const SYSTEM_PROMPT = `You are a helpful documentation assistant for FarmClaw, a managed OpenClaw hosting platform for Upper Midwest row crop farmers.

Rules:
- Answer ONLY from the provided documentation context.
- If the context does not contain the answer, clearly say you could not find it in the docs yet.
- Never invent facts, URLs, features, or citations.
- Keep answers under 150 words.
- Use a concise tone.
- Format with markdown: **bold** for emphasis, \`code\` for technical terms, bullet lists for steps.
- Only cite source pages using this format: [Page Title](/docs/slug)`;

interface SourceRef {
  title: string;
  slug: string;
}

interface DocChunk extends SourceRef {
  heading: string;
  text: string;
  score: number;
}

interface AuthUser {
  id: string;
}

interface AskAuthClient {
  auth: {
    getUser: () => Promise<{ data: { user: AuthUser | null } }>;
  };
}

interface DocPage {
  slug: string;
  frontmatter: {
    title: string;
    section: string;
  };
  content: string;
}

interface ParsedAskInput {
  query: string;
  slugs: string[];
}

interface ParseResultSuccess {
  success: true;
  data: ParsedAskInput;
}

interface ParseResultFailure {
  success: false;
  details: unknown;
}

interface DocsAskDeps {
  createClient: () => Promise<AskAuthClient>;
  consumeDurableRateLimit: (input: {
    action: string;
    key: string;
    windowSeconds: number;
    maxAttempts: number;
  }) => Promise<boolean>;
  parseInput: (input: unknown) => ParseResultSuccess | ParseResultFailure;
  getAllDocs: () => DocPage[];
  getDocBySlug: (slug: string) => DocPage | null;
  stripMdx: (content: string) => string;
  fetchFn: typeof fetch;
  getOpenRouterApiKey: () => string | undefined;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}

function splitChunk(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      const words = paragraph.split(/\s+/);
      let segment = "";

      for (const word of words) {
        const candidate = segment ? `${segment} ${word}` : word;
        if (candidate.length > maxChars) {
          if (segment) chunks.push(segment);
          segment = word;
        } else {
          segment = candidate;
        }
      }

      if (segment) chunks.push(segment);
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars) {
      if (current) chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function buildDocChunks(
  source: SourceRef,
  content: string,
  stripMdxFn: (content: string) => string
): DocChunk[] {
  const lines = content.split("\n");
  const chunks: DocChunk[] = [];
  let heading = source.title;
  let sectionLines: string[] = [];

  const flushSection = () => {
    if (sectionLines.length === 0) return;

    const cleaned = stripMdxFn(sectionLines.join("\n")).trim();
    sectionLines = [];

    if (!cleaned) return;

    for (const part of splitChunk(cleaned, MAX_CHUNK_CHARS)) {
      chunks.push({
        ...source,
        heading,
        text: part,
        score: 0,
      });
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      flushSection();
      heading = headingMatch[1].trim();
      continue;
    }

    sectionLines.push(line);
  }

  flushSection();

  if (chunks.length === 0) {
    const fallback = stripMdxFn(content).trim();
    if (fallback) {
      for (const part of splitChunk(fallback, MAX_CHUNK_CHARS)) {
        chunks.push({
          ...source,
          heading: source.title,
          text: part,
          score: 0,
        });
      }
    }
  }

  return chunks;
}

function scoreChunk(chunk: DocChunk, query: string): number {
  const normalizedQuery = query.toLowerCase();
  const terms = tokenize(query);
  const title = chunk.title.toLowerCase();
  const heading = chunk.heading.toLowerCase();
  const body = chunk.text.toLowerCase();

  let score = 0;

  if (title.includes(normalizedQuery)) score += 12;
  if (heading.includes(normalizedQuery)) score += 10;
  if (body.includes(normalizedQuery)) score += 8;

  for (const term of terms) {
    if (title.includes(term)) score += 5;
    if (heading.includes(term)) score += 4;
    if (body.includes(term)) score += 2;
  }

  return score;
}

function rankFallbackDocs(
  query: string,
  getAllDocsFn: () => DocPage[],
  stripMdxFn: (content: string) => string
): string[] {
  const docs = getAllDocsFn();
  const terms = tokenize(query);

  const scored = docs
    .map((doc) => {
      const title = doc.frontmatter.title.toLowerCase();
      const section = doc.frontmatter.section.toLowerCase();
      const text = stripMdxFn(doc.content).slice(0, 4_000).toLowerCase();

      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 6;
        if (section.includes(term)) score += 4;
        if (text.includes(term)) score += 1;
      }

      return { slug: doc.slug, score };
    })
    .sort((a, b) => b.score - a.score);

  const relevant = scored
    .filter((item) => item.score > 0)
    .slice(0, 5)
    .map((item) => item.slug);

  if (relevant.length > 0) {
    return relevant;
  }

  return scored.slice(0, 3).map((item) => item.slug);
}

export function createDocsAskHandler(deps: DocsAskDeps) {
  return async function docsAskPost(request: Request): Promise<Response> {
    const supabase = await deps.createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const askAllowed = await deps.consumeDurableRateLimit({
      action: "docs_ask_user",
      key: user.id,
      windowSeconds: DOCS_ASK_WINDOW_SECONDS,
      maxAttempts: DOCS_ASK_MAX_ATTEMPTS,
    }).catch(() => null);

    if (askAllowed === null) {
      return Response.json(
        { error: "Rate limiter unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    if (!askAllowed) {
      return Response.json(
        { error: "Too many questions. Please wait a moment." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = deps.parseInput(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.details },
        { status: 400 }
      );
    }

    const { query } = parsed.data;
    const requestedSlugs = [...new Set(parsed.data.slugs)];
    const slugs =
      requestedSlugs.length > 0
        ? requestedSlugs
        : rankFallbackDocs(query, deps.getAllDocs, deps.stripMdx);

    const chunks: DocChunk[] = [];

    for (const slug of slugs) {
      const doc = deps.getDocBySlug(slug);
      if (!doc) continue;

      chunks.push(
        ...buildDocChunks(
          { title: doc.frontmatter.title, slug: doc.slug },
          doc.content,
          deps.stripMdx
        )
      );
    }

    if (chunks.length === 0) {
      return Response.json(
        { error: "No documentation found for the provided slugs." },
        { status: 404 }
      );
    }

    const rankedChunks = chunks
      .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, query) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(MAX_CHUNKS * 3, MAX_CHUNKS));

    const selectedChunks: DocChunk[] = [];
    let usedChars = 0;

    for (const chunk of rankedChunks) {
      const block = `--- ${chunk.title} · ${chunk.heading} (/docs/${chunk.slug}) ---\n${chunk.text}`;

      if (usedChars + block.length > MAX_CONTEXT_CHARS) {
        if (selectedChunks.length === 0) {
          selectedChunks.push({
            ...chunk,
            text: chunk.text.slice(0, MAX_CONTEXT_CHARS),
          });
        }
        continue;
      }

      selectedChunks.push(chunk);
      usedChars += block.length;

      if (selectedChunks.length >= MAX_CHUNKS) break;
    }

    if (selectedChunks.length === 0) {
      selectedChunks.push(...rankedChunks.slice(0, MAX_CHUNKS));
    }

    const sources: SourceRef[] = [];
    const sourceSeen = new Set<string>();
    for (const chunk of selectedChunks) {
      if (sourceSeen.has(chunk.slug)) continue;
      sourceSeen.add(chunk.slug);
      sources.push({ title: chunk.title, slug: chunk.slug });
    }

    const contextBlock = selectedChunks
      .map(
        (chunk) =>
          `--- ${chunk.title} · ${chunk.heading} (/docs/${chunk.slug}) ---\n${chunk.text}`
      )
      .join("\n\n");

    const sourceList = sources
      .map((source) => `- ${source.title}: /docs/${source.slug}`)
      .join("\n");

    const userMessage = `Documentation context:\n\n${contextBlock}\n\nAllowed source links:\n${sourceList}\n\nUser question: ${query}`;

    const apiKey = deps.getOpenRouterApiKey();
    if (!apiKey) {
      return Response.json(
        { error: "AI service is not configured." },
        { status: 503 }
      );
    }

    const upstreamController = new AbortController();
    const timeoutId = setTimeout(() => {
      upstreamController.abort("timeout");
    }, OPENROUTER_TIMEOUT_MS);

    request.signal.addEventListener(
      "abort",
      () => {
        upstreamController.abort("client_disconnected");
      },
      { once: true }
    );

    let orResponse: Response;

    try {
      orResponse = await deps.fetchFn("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://farmclaw.com",
          "X-Title": "FarmClaw Docs AI",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4-5",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          stream: true,
          temperature: 0.2,
          max_tokens: 600,
        }),
        signal: upstreamController.signal,
      });
    } catch {
      clearTimeout(timeoutId);

      if (upstreamController.signal.reason === "timeout") {
        return Response.json(
          { error: "AI request timed out. Please try again." },
          { status: 504 }
        );
      }

      return Response.json(
        { error: "AI service temporarily unavailable." },
        { status: 502 }
      );
    }

    if (!orResponse.ok) {
      clearTimeout(timeoutId);
      const errText = await orResponse.text();
      console.error("[DOCS_ASK] OpenRouter error:", errText);
      return Response.json(
        { error: "AI service temporarily unavailable." },
        { status: 502 }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = orResponse.body?.getReader();
        if (!reader) {
          controller.close();
          clearTimeout(timeoutId);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`)
        );

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // skip unparseable chunks
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("[DOCS_ASK] Stream error:", err);
        } finally {
          clearTimeout(timeoutId);
          await reader.cancel().catch(() => undefined);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  };
}
