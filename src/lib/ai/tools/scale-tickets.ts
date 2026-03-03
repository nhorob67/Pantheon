import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { extractScaleTicketFromImage } from "../vision-ocr";
import { sanitizeLikePattern, sanitizeOrFilterValue } from "@/lib/security/postgrest-sanitize";

const BUSHEL_WEIGHTS: Record<string, number> = {
  corn: 56,
  soybeans: 60,
  "spring wheat": 60,
  "winter wheat": 60,
  durum: 60,
  barley: 48,
  sunflowers: 24,
  canola: 50,
  "dry beans": 60,
  flax: 56,
};

function lbsToBushels(lbs: number, crop: string): number {
  const weight = BUSHEL_WEIGHTS[crop.toLowerCase()] ?? 56;
  return Math.round((lbs / weight) * 100) / 100;
}

export function createScaleTicketTools(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string
) {
  return {
    add_scale_ticket: tool({
      description:
        "Log a grain delivery scale ticket. Requires at minimum: crop, elevator, and either net weight or gross+tare. Auto-calculates bushels from weight.",
      inputSchema: z.object({
        date: z.string().optional().describe("Delivery date (YYYY-MM-DD). Defaults to today."),
        crop: z.string().describe("Crop type (e.g., Corn, Soybeans, Spring Wheat)"),
        elevator: z.string().describe("Elevator/buyer name"),
        gross_weight_lbs: z.number().optional().describe("Gross weight in pounds"),
        tare_weight_lbs: z.number().optional().describe("Tare weight in pounds"),
        net_weight_lbs: z.number().optional().describe("Net weight in pounds (or auto-calc from gross-tare)"),
        moisture_pct: z.number().optional().describe("Moisture percentage"),
        test_weight: z.number().optional().describe("Test weight (lbs/bu)"),
        dockage_pct: z.number().optional().describe("Dockage percentage"),
        price_per_bushel: z.number().optional().describe("Price per bushel"),
        grade: z.string().optional().describe("Grade"),
        truck_number: z.string().optional().describe("Truck number"),
        load_number: z.string().optional().describe("Load number"),
        field: z.string().optional().describe("Field name"),
        notes: z.string().optional().describe("Additional notes"),
        source: z.enum(["manual", "voice", "ocr"]).optional().describe("Entry method"),
      }),
      execute: async (params) => {
        const netLbs =
          params.net_weight_lbs ??
          ((params.gross_weight_lbs ?? 0) - (params.tare_weight_lbs ?? 0));
        if (netLbs <= 0) {
          return { error: "Net weight must be positive. Provide net_weight_lbs or gross and tare weights." };
        }
        const bushels = lbsToBushels(netLbs, params.crop);
        const ticketDate = params.date || new Date().toISOString().slice(0, 10);

        const { data, error } = await admin.from("tenant_scale_tickets").insert({
          tenant_id: tenantId,
          customer_id: customerId,
          date: ticketDate,
          crop: params.crop,
          elevator: params.elevator,
          gross_weight_lbs: params.gross_weight_lbs ?? null,
          tare_weight_lbs: params.tare_weight_lbs ?? null,
          net_weight_lbs: netLbs,
          bushels,
          moisture_pct: params.moisture_pct ?? null,
          test_weight: params.test_weight ?? null,
          dockage_pct: params.dockage_pct ?? null,
          price_per_bushel: params.price_per_bushel ?? null,
          grade: params.grade ?? null,
          truck_number: params.truck_number ?? null,
          load_number: params.load_number ?? null,
          field: params.field ?? null,
          notes: params.notes ?? null,
          source: params.source ?? "manual",
        }).select("id, date, crop, elevator, net_weight_lbs, bushels").single();

        if (error) return { error: `Failed to save ticket: ${error.message}` };
        return {
          saved: true,
          ticket: data,
          summary: `Logged ${bushels.toLocaleString()} bu ${params.crop} (${netLbs.toLocaleString()} lbs) at ${params.elevator} on ${ticketDate}`,
        };
      },
    }),

    list_scale_tickets: tool({
      description: "List scale tickets with optional filters by date range, crop, or elevator.",
      inputSchema: z.object({
        from_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        to_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
        crop: z.string().optional().describe("Filter by crop"),
        elevator: z.string().optional().describe("Filter by elevator"),
        limit: z.number().optional().describe("Max results (default 25)"),
      }),
      execute: async (params) => {
        let query = admin
          .from("tenant_scale_tickets")
          .select("id, date, crop, elevator, net_weight_lbs, bushels, moisture_pct, price_per_bushel, field, notes")
          .eq("tenant_id", tenantId)
          .order("date", { ascending: false })
          .limit(params.limit ?? 25);

        if (params.from_date) query = query.gte("date", params.from_date);
        if (params.to_date) query = query.lte("date", params.to_date);
        if (params.crop) query = query.ilike("crop", sanitizeLikePattern(params.crop));
        if (params.elevator) query = query.ilike("elevator", `%${sanitizeLikePattern(params.elevator)}%`);

        const { data, error } = await query;
        if (error) return { error: `Failed to query tickets: ${error.message}` };
        return { tickets: data, count: (data || []).length };
      },
    }),

    search_scale_tickets: tool({
      description: "Full-text search across scale ticket notes, elevator, crop, and field names.",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
        limit: z.number().optional().describe("Max results (default 10)"),
      }),
      execute: async (params) => {
        const { data, error } = await admin
          .from("tenant_scale_tickets")
          .select("id, date, crop, elevator, net_weight_lbs, bushels, moisture_pct, field, notes")
          .eq("tenant_id", tenantId)
          .or(`crop.ilike.%${sanitizeOrFilterValue(params.query)}%,elevator.ilike.%${sanitizeOrFilterValue(params.query)}%,field.ilike.%${sanitizeOrFilterValue(params.query)}%,notes.ilike.%${sanitizeOrFilterValue(params.query)}%`)
          .order("date", { ascending: false })
          .limit(params.limit ?? 10);

        if (error) return { error: `Search failed: ${error.message}` };
        return { tickets: data, count: (data || []).length };
      },
    }),

    ocr_scale_ticket: tool({
      description:
        "Extract scale ticket data from an image using OCR. Use this when the farmer sends a photo of a scale ticket. Returns extracted fields for confirmation before saving.",
      inputSchema: z.object({
        image_url: z.string().describe("URL of the scale ticket image"),
      }),
      execute: async (params) => {
        // Load farm context for better OCR accuracy
        const { data: profile } = await admin
          .from("farm_profiles")
          .select("crops, elevators")
          .eq("customer_id", customerId)
          .maybeSingle();

        const crops = Array.isArray(profile?.crops) ? profile.crops as string[] : [];
        const elevators = Array.isArray(profile?.elevators)
          ? (profile.elevators as Array<{ name: string } | string>).map((e) =>
              typeof e === "string" ? e : e.name || "Unknown"
            )
          : [];

        const result = await extractScaleTicketFromImage(params.image_url, {
          crops,
          elevators,
        });

        if (result.confidence < 0.3) {
          return {
            error:
              "Could not read the scale ticket clearly. Please try taking a clearer photo or entering the data manually.",
            confidence: result.confidence,
          };
        }

        return {
          extracted: true,
          confidence: result.confidence,
          data: result,
          message: `I extracted the following from the ticket (confidence: ${(result.confidence * 100).toFixed(0)}%). Please confirm the details are correct, and I'll save it for you.`,
        };
      },
    }),

    get_scale_ticket_summary: tool({
      description:
        "Get summary totals of scale tickets grouped by crop and elevator. Shows total bushels, loads, and average moisture.",
      inputSchema: z.object({
        from_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        to_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
      }),
      execute: async (params) => {
        let query = admin
          .from("tenant_scale_tickets")
          .select("crop, elevator, net_weight_lbs, bushels, moisture_pct")
          .eq("tenant_id", tenantId);

        if (params.from_date) query = query.gte("date", params.from_date);
        if (params.to_date) query = query.lte("date", params.to_date);

        const { data, error } = await query;
        if (error) return { error: `Summary failed: ${error.message}` };

        type Row = { crop: string; elevator: string; net_weight_lbs: number; bushels: number; moisture_pct: number | null };
        const rows = (data || []) as Row[];
        const grouped = new Map<string, { bushels: number; lbs: number; loads: number; moistures: number[] }>();
        for (const r of rows) {
          const key = `${r.crop}|${r.elevator}`;
          const group = grouped.get(key) || { bushels: 0, lbs: 0, loads: 0, moistures: [] };
          group.bushels += r.bushels || 0;
          group.lbs += r.net_weight_lbs || 0;
          group.loads += 1;
          if (r.moisture_pct != null) group.moistures.push(r.moisture_pct);
          grouped.set(key, group);
        }

        const summary = Array.from(grouped.entries()).map(([key, g]) => {
          const [crop, elevator] = key.split("|");
          const avgMoisture = g.moistures.length > 0
            ? Math.round((g.moistures.reduce((a, b) => a + b, 0) / g.moistures.length) * 10) / 10
            : null;
          return {
            crop,
            elevator,
            total_bushels: Math.round(g.bushels * 100) / 100,
            total_lbs: g.lbs,
            loads: g.loads,
            avg_moisture_pct: avgMoisture,
          };
        });

        return {
          summary,
          total_loads: rows.length,
          period: { from: params.from_date ?? "all", to: params.to_date ?? "all" },
        };
      },
    }),
  };
}
