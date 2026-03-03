export type MemoryTier = "working" | "episodic" | "knowledge";
export type MemoryType = "fact" | "preference" | "commitment" | "outcome" | "summary" | "other";

/**
 * Classify a memory record into a tier based on type, confidence, and content length.
 *
 * Rules:
 *   - outcome/summary/other type OR confidence < 0.5 OR content < 20 chars -> "working"
 *   - fact + confidence >= 0.85 -> "knowledge"
 *   - preference + confidence >= 0.9 -> "knowledge"
 *   - everything else -> "episodic"
 */
export function classifyMemoryTier(
  memoryType: MemoryType,
  confidence: number,
  content: string
): MemoryTier {
  const trimmed = content.trim();

  // Working tier: low-signal records
  if (
    memoryType === "outcome" ||
    memoryType === "summary" ||
    memoryType === "other" ||
    confidence < 0.5 ||
    trimmed.length < 20
  ) {
    return "working";
  }

  // Knowledge tier: high-confidence facts or preferences
  if (memoryType === "fact" && confidence >= 0.85) {
    return "knowledge";
  }

  if (memoryType === "preference" && confidence >= 0.9) {
    return "knowledge";
  }

  // Everything else: episodic
  return "episodic";
}
