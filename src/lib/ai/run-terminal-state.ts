/**
 * Terminal state classification for agent turns.
 *
 * Uses a lightweight AI call to determine whether an agent turn completed
 * the user's request or is still in progress.
 */

import { generateObject } from "ai";
import { z } from "zod";

export const runTerminalStateSchema = z.object({
  state: z.enum(["completed", "continuing"]),
  rationale: z.string().max(200).optional(),
});

export type RunTerminalState = z.infer<typeof runTerminalStateSchema>["state"];

export async function resolveRunTerminalState(input: {
  model: Parameters<typeof generateObject<typeof runTerminalStateSchema>>[0]["model"];
  userRequest: string;
  responseText: string;
  progressUpdatesSentCount: number;
  toolSummary: string;
}): Promise<RunTerminalState> {
  if (!input.responseText.trim()) {
    return input.progressUpdatesSentCount > 0 ? "continuing" : "completed";
  }

  try {
    const { object } = await generateObject({
      model: input.model,
      schema: runTerminalStateSchema,
      temperature: 0,
      system:
        "Classify the assistant turn's execution state. " +
        "Return `completed` only if the user's request was actually answered or fully executed in this run. " +
        "Return `continuing` if the assistant is still researching, planning next steps, promising future work, monitoring something over time, or has not yet delivered the requested result. " +
        "If unsure, choose `continuing`.",
      prompt: [
        `User request: ${input.userRequest || "[empty]"}`,
        `Assistant reply draft: ${input.responseText}`,
        `Progress updates already sent: ${input.progressUpdatesSentCount}`,
        `Tool summary: ${input.toolSummary || "[none]"}`,
      ].join("\n\n"),
    });
    return object.state;
  } catch {
    return input.progressUpdatesSentCount > 0 ? "continuing" : "completed";
  }
}
