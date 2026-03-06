import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheapCheckResult } from "@/types/heartbeat";

interface BidRow {
  elevator_key: string;
  crop: string;
  cash_price: number | null;
  delivery_period: string | null;
  scraped_at: string;
}

export async function checkGrainPriceMovement(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string,
  thresholdCents: number
): Promise<CheapCheckResult> {
  // Get the farm's configured crops
  const { data: profile } = await admin
    .from("farm_profiles")
    .select("crops")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!profile?.crops || !Array.isArray(profile.crops) || profile.crops.length === 0) {
    return { status: "ok", summary: "No crops configured" };
  }

  // Get recent bids (last 2 days) to compare
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: bids, error } = await admin
    .from("grain_bid_cache")
    .select("elevator_key, crop, cash_price, delivery_period, scraped_at")
    .in("crop", profile.crops)
    .gte("scraped_at", twoDaysAgo)
    .order("scraped_at", { ascending: false })
    .limit(500);

  if (error || !bids || bids.length === 0) {
    return { status: "ok", summary: "No recent grain bids" };
  }

  const typedBids = bids as BidRow[];

  // Group by elevator+crop+delivery_period and compare latest vs previous
  const groups = new Map<string, BidRow[]>();
  for (const bid of typedBids) {
    const key = `${bid.elevator_key}:${bid.crop}:${bid.delivery_period || "spot"}`;
    const arr = groups.get(key) || [];
    arr.push(bid);
    groups.set(key, arr);
  }

  const movers: Array<{
    elevator: string;
    crop: string;
    change_cents: number;
    current: number;
    previous: number;
  }> = [];

  for (const [, bidGroup] of groups) {
    if (bidGroup.length < 2) continue;
    const latest = bidGroup[0];
    const previous = bidGroup[1];
    if (latest.cash_price == null || previous.cash_price == null) continue;

    const changeCents = Math.round((latest.cash_price - previous.cash_price) * 100);
    if (Math.abs(changeCents) >= thresholdCents) {
      movers.push({
        elevator: latest.elevator_key,
        crop: latest.crop,
        change_cents: changeCents,
        current: latest.cash_price,
        previous: previous.cash_price,
      });
    }
  }

  if (movers.length === 0) {
    return { status: "ok", summary: "No significant grain price movement" };
  }

  return {
    status: "alert",
    summary: `${movers.length} grain price movement(s) exceeding ${thresholdCents}c threshold`,
    data: movers,
  };
}
