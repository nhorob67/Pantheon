import { z } from "zod/v4";
import { SUPPORTED_STATES, CROPS } from "@/types/farm";

export const step1Schema = z.object({
  farm_name: z.string().min(1, "Farm name is required").max(100),
  state: z.enum(SUPPORTED_STATES, { message: "Select a state" }),
  county: z.string().min(1, "County is required"),
  primary_crops: z
    .array(z.enum(CROPS))
    .min(1, "Select at least one crop"),
  acres: z.number().int().positive("Enter your total acres"),
});

export const elevatorEntrySchema = z.object({
  name: z.string().min(1, "Elevator name is required"),
  url: z.string().url("Enter a valid URL"),
  crops: z.array(z.string()).min(1, "Select at least one crop"),
});

export const step2Schema = z.object({
  elevators: z.array(elevatorEntrySchema).min(1, "Add at least one elevator"),
});

export const step3Schema = z
  .object({
    weather_location: z.string().min(1, "Enter a town or zip code"),
    weather_lat: z.number().min(40, "Latitude out of range").max(49),
    weather_lng: z.number().min(-104, "Longitude out of range").max(-89),
    timezone: z.string(),
  })
  .refine((d) => d.weather_lat !== 0 || d.weather_lng !== 0, {
    message: "Use the Locate button to set coordinates",
    path: ["weather_lat"],
  });

export const step4Schema = z.object({
  channel_type: z.literal("discord"),
  channel_token: z.string().min(1, "Token is required"),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
