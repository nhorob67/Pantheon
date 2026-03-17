import type { JsonContent } from "@/types/file-creation";

/**
 * Generate a pretty-printed JSON buffer.
 */
export function generateJson(content: JsonContent): Buffer {
  const text = JSON.stringify(content.data, null, 2);
  return Buffer.from(text, "utf-8");
}
