import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { farmclawModel } from "./client";

const scaleTicketOCRSchema = z.object({
  date: z.string().nullable().describe("Delivery date (YYYY-MM-DD)"),
  crop: z.string().nullable().describe("Crop type"),
  elevator: z.string().nullable().describe("Elevator or buyer name"),
  gross_weight_lbs: z.number().nullable().describe("Gross weight in pounds"),
  tare_weight_lbs: z.number().nullable().describe("Tare weight in pounds"),
  net_weight_lbs: z.number().nullable().describe("Net weight in pounds"),
  moisture_pct: z.number().nullable().describe("Moisture percentage"),
  test_weight: z.number().nullable().describe("Test weight in lbs/bu"),
  dockage_pct: z.number().nullable().describe("Dockage percentage"),
  price_per_bushel: z.number().nullable().describe("Price per bushel"),
  ticket_number: z.string().nullable().describe("Ticket number if visible"),
  truck_number: z.string().nullable().describe("Truck number if visible"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
});

export type ScaleTicketOCRResult = z.infer<typeof scaleTicketOCRSchema>;

export async function extractScaleTicketFromImage(
  imageUrl: string,
  farmContext: { crops: string[]; elevators: string[] },
  model?: LanguageModel
): Promise<ScaleTicketOCRResult> {
  const { object } = await generateObject({
    model: model ?? farmclawModel,
    schema: scaleTicketOCRSchema,
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract all scale ticket fields from this image. This is a grain delivery scale ticket from an Upper Midwest farm.

Known crops for this farm: ${farmContext.crops.join(", ") || "various row crops"}
Known elevators: ${farmContext.elevators.join(", ") || "various elevators"}

Extract every field you can read. For fields you can't read clearly, set them to null. Set confidence to reflect how clearly you could read the overall ticket (1.0 = crystal clear, 0.5 = partially readable, 0.0 = can't read at all).`,
          },
          {
            type: "image",
            image: imageUrl,
          },
        ],
      },
    ],
  });

  return object;
}
