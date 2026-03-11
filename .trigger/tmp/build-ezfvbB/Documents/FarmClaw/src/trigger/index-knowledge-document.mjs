import {
  generateEmbeddings
} from "../../../../chunk-XSF42NVM.mjs";
import {
  createTriggerAdminClient
} from "../../../../chunk-HT5RPO7D.mjs";
import {
  task
} from "../../../../chunk-OGNGFKGT.mjs";
import "../../../../chunk-WWNEOE5T.mjs";
import "../../../../chunk-RLLQVKNR.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-262SQFPS.mjs";

// src/trigger/index-knowledge-document.ts
init_esm();

// src/lib/ai/knowledge-indexer.ts
init_esm();
var CHUNK_SIZE = 500;
var CHUNK_OVERLAP = 50;
var MIN_CHUNK_WORDS = 20;
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const sections = splitByHeadings(trimmed);
  const chunks = [];
  for (const section of sections) {
    const sectionWords = section.split(/\s+/).length;
    if (sectionWords <= chunkSize) {
      if (sectionWords >= MIN_CHUNK_WORDS) {
        chunks.push(section.trim());
      }
      continue;
    }
    const paragraphs = section.split(/\n\n+/).filter((p) => p.trim().length > 0);
    let accumulator = [];
    let accumWords = 0;
    for (const para of paragraphs) {
      const paraWords = para.split(/\s+/).length;
      if (paraWords > chunkSize) {
        if (accumWords >= MIN_CHUNK_WORDS) {
          chunks.push(accumulator.join("\n\n").trim());
        }
        accumulator = [];
        accumWords = 0;
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
    if (accumWords >= MIN_CHUNK_WORDS) {
      chunks.push(accumulator.join("\n\n").trim());
    }
  }
  return chunks;
}
__name(chunkText, "chunkText");
function splitByHeadings(text) {
  const lines = text.split("\n");
  const sections = [];
  let current = [];
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
__name(splitByHeadings, "splitByHeadings");
async function indexKnowledgeDocument(admin, input) {
  await admin.from("tenant_knowledge_chunks").delete().eq("knowledge_item_id", input.knowledgeItemId);
  const chunks = chunkText(input.content);
  if (chunks.length === 0) return { chunksCreated: 0 };
  let embeddings = [];
  try {
    embeddings = await generateEmbeddings(chunks);
  } catch {
    embeddings = chunks.map(() => []);
  }
  const rows = chunks.map((content, index) => ({
    tenant_id: input.tenantId,
    customer_id: input.customerId,
    knowledge_item_id: input.knowledgeItemId,
    agent_id: input.agentId,
    chunk_index: index,
    content,
    embedding: embeddings[index]?.length > 0 ? JSON.stringify(embeddings[index]) : null,
    token_count: Math.ceil(content.split(/\s+/).length * 1.3)
  }));
  const { error } = await admin.from("tenant_knowledge_chunks").insert(rows);
  if (error) {
    throw new Error(`Failed to index knowledge chunks: ${error.message}`);
  }
  return { chunksCreated: chunks.length };
}
__name(indexKnowledgeDocument, "indexKnowledgeDocument");

// src/trigger/index-knowledge-document.ts
var indexKnowledgeDocumentTask = task({
  id: "index-knowledge-document",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2e3,
    maxTimeoutInMs: 15e3,
    factor: 2
  },
  run: /* @__PURE__ */ __name(async (payload) => {
    const admin = createTriggerAdminClient();
    const { data: item } = await admin.from("tenant_knowledge_items").select("id, status").eq("id", payload.knowledgeItemId).maybeSingle();
    if (!item || item.status === "archived") {
      return {
        skipped: true,
        reason: item ? "archived" : "not_found",
        knowledgeItemId: payload.knowledgeItemId
      };
    }
    const result = await indexKnowledgeDocument(admin, {
      tenantId: payload.tenantId,
      customerId: payload.customerId,
      knowledgeItemId: payload.knowledgeItemId,
      agentId: payload.agentId,
      content: payload.content
    });
    await admin.from("tenant_knowledge_items").update({ indexed_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", payload.knowledgeItemId);
    return {
      knowledgeItemId: payload.knowledgeItemId,
      tenantId: payload.tenantId,
      chunksCreated: result.chunksCreated
    };
  }, "run")
});
export {
  indexKnowledgeDocumentTask
};
//# sourceMappingURL=index-knowledge-document.mjs.map
