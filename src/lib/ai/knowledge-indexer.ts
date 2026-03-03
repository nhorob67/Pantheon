import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbeddings } from "./embeddings";

const CHUNK_SIZE = 500; // ~500 words per chunk
const CHUNK_OVERLAP = 50; // ~50 word overlap for word-window fallback
const MIN_CHUNK_WORDS = 20;

/**
 * Structure-aware text chunking.
 *
 * 1. Split on heading lines (# through ####) into sections
 * 2. Within oversized sections, split on paragraph boundaries (\n\n+)
 * 3. Accumulate paragraphs into chunks up to CHUNK_SIZE words
 * 4. If any paragraph exceeds CHUNK_SIZE, fall back to word-window with overlap
 * 5. Skip chunks under MIN_CHUNK_WORDS (noise)
 */
export function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Split into sections by headings
  const sections = splitByHeadings(trimmed);

  const chunks: string[] = [];

  for (const section of sections) {
    const sectionWords = section.split(/\s+/).length;

    if (sectionWords <= chunkSize) {
      if (sectionWords >= MIN_CHUNK_WORDS) {
        chunks.push(section.trim());
      }
      continue;
    }

    // Split oversized section by paragraph boundaries
    const paragraphs = section.split(/\n\n+/).filter((p) => p.trim().length > 0);
    let accumulator: string[] = [];
    let accumWords = 0;

    for (const para of paragraphs) {
      const paraWords = para.split(/\s+/).length;

      // If a single paragraph exceeds chunk size, use word-window fallback
      if (paraWords > chunkSize) {
        // Flush accumulator first
        if (accumWords >= MIN_CHUNK_WORDS) {
          chunks.push(accumulator.join("\n\n").trim());
        }
        accumulator = [];
        accumWords = 0;

        // Word-window split for the oversized paragraph
        const words = para.split(/\s+/);
        let start = 0;
        while (start < words.length) {
          const end = Math.min(start + chunkSize, words.length);
          const chunk = words.slice(start, end).join(" ");
          if (chunk.split(/\s+/).length >= MIN_CHUNK_WORDS) {
            chunks.push(chunk);
          }
          if (end >= words.length) break;
          start = end - overlap;
        }
        continue;
      }

      // Would adding this paragraph exceed chunk size?
      if (accumWords + paraWords > chunkSize && accumWords > 0) {
        if (accumWords >= MIN_CHUNK_WORDS) {
          chunks.push(accumulator.join("\n\n").trim());
        }
        accumulator = [];
        accumWords = 0;
      }

      accumulator.push(para);
      accumWords += paraWords;
    }

    // Flush remaining
    if (accumWords >= MIN_CHUNK_WORDS) {
      chunks.push(accumulator.join("\n\n").trim());
    }
  }

  return chunks;
}

/**
 * Split text by heading lines (^#{1-4}\s+).
 * Each heading stays with its content as the start of its section.
 */
function splitByHeadings(text: string): string[] {
  const lines = text.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,4}\s+/.test(line) && current.length > 0) {
      sections.push(current.join("\n"));
      current = [];
    }
    current.push(line);
  }

  if (current.length > 0) {
    sections.push(current.join("\n"));
  }

  return sections;
}

export async function indexKnowledgeDocument(
  admin: SupabaseClient,
  input: {
    tenantId: string;
    customerId: string;
    knowledgeItemId: string;
    agentId: string | null;
    content: string;
  }
): Promise<{ chunksCreated: number }> {
  // Delete existing chunks for this document (re-index)
  await admin
    .from("tenant_knowledge_chunks")
    .delete()
    .eq("knowledge_item_id", input.knowledgeItemId);

  // Chunk the document
  const chunks = chunkText(input.content);
  if (chunks.length === 0) return { chunksCreated: 0 };

  // Generate embeddings in batch
  let embeddings: number[][] = [];
  try {
    embeddings = await generateEmbeddings(chunks);
  } catch {
    // If embedding fails, store chunks without embeddings
    embeddings = chunks.map(() => []);
  }

  // Insert chunks
  const rows = chunks.map((content, index) => ({
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    knowledge_item_id: input.knowledgeItemId,
    agent_id: input.agentId,
    chunk_index: index,
    content,
    embedding: embeddings[index]?.length > 0 ? JSON.stringify(embeddings[index]) : null,
    token_count: Math.ceil(content.split(/\s+/).length * 1.3),
  }));

  const { error } = await admin.from("tenant_knowledge_chunks").insert(rows);
  if (error) {
    throw new Error(`Failed to index knowledge chunks: ${error.message}`);
  }

  return { chunksCreated: chunks.length };
}

export async function removeKnowledgeIndex(
  admin: SupabaseClient,
  knowledgeItemId: string
): Promise<void> {
  await admin
    .from("tenant_knowledge_chunks")
    .delete()
    .eq("knowledge_item_id", knowledgeItemId);
}
