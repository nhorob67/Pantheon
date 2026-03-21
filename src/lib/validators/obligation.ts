import { z } from "zod/v4";
import {
  OBLIGATION_STATUS_VALUES,
  OBLIGATION_EVENT_TYPE_VALUES,
} from "@/types/obligation";

export const obligationStatusSchema = z.enum(OBLIGATION_STATUS_VALUES);

export const obligationEventTypeSchema = z.enum(OBLIGATION_EVENT_TYPE_VALUES);

export const resolveObligationSchema = z.object({
  obligationId: z.uuid(),
  resumeToken: z.string().min(1),
  outcome: z.enum(["completed", "failed"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type ResolveObligationInput = z.infer<typeof resolveObligationSchema>;
