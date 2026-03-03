import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeLikePattern } from "@/lib/security/postgrest-sanitize";

export function createGrainBidTools(admin: SupabaseClient, customerId: string) {
  return {
    get_grain_bids: tool({
      description:
        "Get current grain bids from the farmer's configured elevators. Shows cash price, basis, and delivery period for each crop/elevator combination.",
      inputSchema: z.object({
        crop: z.string().optional().describe("Filter by crop (e.g., Corn, Soybeans)"),
        elevator: z.string().optional().describe("Filter by elevator name"),
      }),
      execute: async (params) => {
        // Get farmer's configured elevators
        const { data: profile } = await admin
          .from("farm_profiles")
          .select("elevators, crops")
          .eq("customer_id", customerId)
          .maybeSingle();

        const elevators = (profile?.elevators as Array<{ name: string }>) || [];
        const elevatorNames = elevators.map((e) => (typeof e === "string" ? e : e.name));

        let query = admin
          .from("grain_bid_cache")
          .select("elevator_key, crop, cash_price, basis_cents, futures_month, delivery_period, scraped_at")
          .order("scraped_at", { ascending: false });

        if (params.crop) {
          query = query.ilike("crop", sanitizeLikePattern(params.crop));
        }
        if (params.elevator) {
          query = query.ilike("elevator_key", `%${sanitizeLikePattern(params.elevator)}%`);
        } else if (elevatorNames.length > 0) {
          query = query.in("elevator_key", elevatorNames);
        }

        const { data, error } = await query;
        if (error) return { error: `Failed to fetch bids: ${error.message}` };

        if (!data || data.length === 0) {
          return {
            bids: [],
            message: "No cached bids available. Bids are updated during market hours (7 AM, 9 AM, 12 PM, 3 PM CT, Mon-Fri).",
          };
        }

        // Check staleness
        const now = Date.now();
        const bids = data.map((b) => {
          const scrapedAt = new Date(b.scraped_at).getTime();
          const ageHours = (now - scrapedAt) / (1000 * 60 * 60);
          return {
            elevator: b.elevator_key,
            crop: b.crop,
            cash_price: b.cash_price,
            basis: b.basis_cents != null ? `${b.basis_cents > 0 ? "+" : ""}${b.basis_cents}¢` : null,
            futures_month: b.futures_month,
            delivery_period: b.delivery_period,
            last_updated: b.scraped_at,
            stale: ageHours > 24,
            stale_warning: ageHours > 24 ? `Data is ${Math.round(ageHours)}h old` : null,
          };
        });

        return { bids, fetched_at: new Date().toISOString() };
      },
    }),

    compare_elevator_bids: tool({
      description:
        "Compare grain bids across all configured elevators for a specific crop. Sorted from best to worst bid.",
      inputSchema: z.object({
        crop: z.string().describe("Crop to compare (e.g., Corn, Soybeans)"),
      }),
      execute: async ({ crop }) => {
        const { data: profile } = await admin
          .from("farm_profiles")
          .select("elevators")
          .eq("customer_id", customerId)
          .maybeSingle();

        const elevators = (profile?.elevators as Array<{ name: string }>) || [];
        const elevatorNames = elevators.map((e) => (typeof e === "string" ? e : e.name));

        if (elevatorNames.length === 0) {
          return { error: "No elevators configured in farm profile." };
        }

        const { data, error } = await admin
          .from("grain_bid_cache")
          .select("elevator_key, cash_price, basis_cents, futures_month, delivery_period, scraped_at")
          .in("elevator_key", elevatorNames)
          .ilike("crop", crop)
          .order("cash_price", { ascending: false });

        if (error) return { error: `Failed to compare: ${error.message}` };
        if (!data || data.length === 0) {
          return { comparison: [], message: `No ${crop} bids available for your elevators.` };
        }

        const comparison = data.map((b, i) => ({
          rank: i + 1,
          elevator: b.elevator_key,
          cash_price: b.cash_price,
          basis: b.basis_cents != null ? `${b.basis_cents > 0 ? "+" : ""}${b.basis_cents}¢` : null,
          futures_month: b.futures_month,
          delivery_period: b.delivery_period,
          last_updated: b.scraped_at,
        }));

        const best = comparison[0];
        const worst = comparison[comparison.length - 1];
        const spread = best && worst && best.cash_price && worst.cash_price
          ? (best.cash_price - worst.cash_price).toFixed(2)
          : null;

        return {
          crop,
          comparison,
          spread: spread ? `$${spread}/bu spread across elevators` : null,
          fetched_at: new Date().toISOString(),
        };
      },
    }),
  };
}
