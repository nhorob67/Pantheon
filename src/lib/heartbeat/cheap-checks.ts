import type { SupabaseClient } from "@supabase/supabase-js";
import type { HeartbeatChecks, CheapCheckResult } from "@/types/heartbeat";
import { checkWeatherSevere } from "./checks/weather-check";
import { checkGrainPriceMovement } from "./checks/grain-price-check";
import { checkUnreviewedTickets } from "./checks/ticket-check";
import { checkUnansweredEmails } from "./checks/email-check";
import { checkCustomItems } from "./checks/custom-check";

export interface CheapChecksInput {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  checks: HeartbeatChecks;
  customChecks: string[];
}

export interface CheapChecksOutput {
  results: Record<string, CheapCheckResult>;
  hadSignal: boolean;
  signalSummaries: string[];
}

export async function runCheapChecks(input: CheapChecksInput): Promise<CheapChecksOutput> {
  const { admin, tenantId, customerId, checks, customChecks } = input;
  const results: Record<string, CheapCheckResult> = {};
  const promises: Array<{ key: string; promise: Promise<CheapCheckResult> }> = [];

  if (checks.weather_severe) {
    promises.push({
      key: "weather_severe",
      promise: checkWeatherSevere(admin, tenantId, customerId),
    });
  }

  if (checks.grain_price_movement) {
    promises.push({
      key: "grain_price_movement",
      promise: checkGrainPriceMovement(
        admin, tenantId, customerId,
        checks.grain_price_threshold_cents
      ),
    });
  }

  if (checks.unreviewed_tickets) {
    promises.push({
      key: "unreviewed_tickets",
      promise: checkUnreviewedTickets(admin, tenantId, checks.unreviewed_tickets_threshold_hours),
    });
  }

  if (checks.unanswered_emails) {
    promises.push({
      key: "unanswered_emails",
      promise: checkUnansweredEmails(
        admin, tenantId, customerId,
        checks.unanswered_emails_threshold_hours
      ),
    });
  }

  // Run all enabled checks in parallel
  const settled = await Promise.allSettled(promises.map((p) => p.promise));
  for (let i = 0; i < promises.length; i++) {
    const { key } = promises[i];
    const result = settled[i];
    if (result.status === "fulfilled") {
      results[key] = result.value;
    } else {
      results[key] = {
        status: "error",
        summary: `Check failed: ${result.reason instanceof Error ? result.reason.message : "unknown"}`,
      };
    }
  }

  // Custom checks always signal if non-empty
  if (customChecks.length > 0) {
    results.custom_checks = checkCustomItems(customChecks);
  }

  const signalSummaries: string[] = [];
  let hadSignal = false;
  for (const [, result] of Object.entries(results)) {
    if (result.status === "alert") {
      hadSignal = true;
      if (result.summary) signalSummaries.push(result.summary);
    }
  }

  return { results, hadSignal, signalSummaries };
}
