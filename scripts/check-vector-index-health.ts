/**
 * Vector index health check.
 *
 * IVFFlat with lists=100 (migration 00045) is fine for <10K rows but recall
 * degrades above ~50K. This script checks row counts and recommends action.
 *
 * Usage: npx tsx scripts/check-vector-index-health.ts
 */

import { createClient } from "@supabase/supabase-js";

const THRESHOLDS = {
  OK: 25_000,
  MONITOR: 50_000,
} as const;

interface TableStats {
  table: string;
  totalRows: number;
  rowsWithEmbeddings: number;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const tables: Array<{ table: string; embeddingColumn: string }> = [
    { table: "tenant_memory_records", embeddingColumn: "embedding" },
    { table: "tenant_knowledge_chunks", embeddingColumn: "embedding" },
  ];

  const stats: TableStats[] = [];

  for (const { table, embeddingColumn } of tables) {
    const { count: totalRows, error: totalError } = await admin
      .from(table)
      .select("*", { count: "exact", head: true });

    if (totalError) {
      console.error(`Error counting ${table}: ${totalError.message}`);
      continue;
    }

    const { count: rowsWithEmbeddings, error: embError } = await admin
      .from(table)
      .select("*", { count: "exact", head: true })
      .not(embeddingColumn, "is", null);

    if (embError) {
      console.error(`Error counting embeddings in ${table}: ${embError.message}`);
      continue;
    }

    stats.push({
      table,
      totalRows: totalRows ?? 0,
      rowsWithEmbeddings: rowsWithEmbeddings ?? 0,
    });
  }

  console.log("\n=== Vector Index Health Report ===\n");

  let maxEmbeddings = 0;

  for (const s of stats) {
    console.log(`${s.table}:`);
    console.log(`  Total rows:          ${s.totalRows.toLocaleString()}`);
    console.log(`  Rows with embeddings: ${s.rowsWithEmbeddings.toLocaleString()}`);
    console.log();
    maxEmbeddings = Math.max(maxEmbeddings, s.rowsWithEmbeddings);
  }

  if (maxEmbeddings < THRESHOLDS.OK) {
    console.log(`Status: OK — IVFFlat is fine (${maxEmbeddings.toLocaleString()} max embedded rows)`);
  } else if (maxEmbeddings < THRESHOLDS.MONITOR) {
    console.log(`Status: MONITOR — approaching HNSW threshold (${maxEmbeddings.toLocaleString()} max embedded rows)`);
    console.log("Consider planning HNSW migration when you cross 50K rows.");
  } else {
    console.log(`Status: UPGRADE — recommend HNSW migration (${maxEmbeddings.toLocaleString()} max embedded rows)`);
    console.log("\nRecommended migration commands:\n");

    for (const s of stats) {
      if (s.rowsWithEmbeddings >= THRESHOLDS.MONITOR) {
        const indexName = `idx_${s.table}_embedding_hnsw`;
        console.log(`-- ${s.table}`);
        console.log(`DROP INDEX IF EXISTS idx_${s.table}_embedding;`);
        console.log(`CREATE INDEX CONCURRENTLY ${indexName}`);
        console.log(`  ON ${s.table} USING hnsw (embedding vector_cosine_ops)`);
        console.log(`  WITH (m = 16, ef_construction = 64);`);
        console.log();
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
