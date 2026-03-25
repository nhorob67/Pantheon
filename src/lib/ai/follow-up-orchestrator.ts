/**
 * Follow-up scheduling decision logic.
 *
 * Determines whether a structural follow-up should be scheduled
 * after an agent turn completes.
 */

import type { RunTerminalState } from "./run-terminal-state";

export interface StructuralFollowUpDecisionInput {
  hasExplicitFollowUp: boolean;
  hasApprovalRequired: boolean;
  progressUpdatesSentCount: number;
  finalReplyWillBeSent: boolean;
  terminalState: RunTerminalState;
}

export function shouldScheduleStructuralFollowUp(
  input: StructuralFollowUpDecisionInput
): boolean {
  if (input.hasExplicitFollowUp || input.hasApprovalRequired) {
    return false;
  }

  if (input.terminalState === "continuing") {
    return true;
  }

  return input.progressUpdatesSentCount > 0 && !input.finalReplyWillBeSent;
}
