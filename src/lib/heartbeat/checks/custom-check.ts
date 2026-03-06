import type { CheapCheckResult } from "@/types/heartbeat";

export function checkCustomItems(
  customChecks: string[]
): CheapCheckResult {
  if (customChecks.length === 0) {
    return { status: "ok" };
  }

  return {
    status: "alert",
    summary: `${customChecks.length} custom check(s) need LLM evaluation`,
    data: { items: customChecks },
  };
}
