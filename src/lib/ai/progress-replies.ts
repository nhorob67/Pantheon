export type UserVisibleReplyVisibility = "progress" | "final";

export type UserVisibleReplyKind = "none" | "progress" | "promise" | "result";

const PROMISE_LIKE_REPLY_PATTERN =
  /\b(?:let me (?:try|check|set up|look into|work on|handle|dig in|see)|i['\u2019]ll (?:try|check|set up|look into|work on|handle|get|do|take care|report back|follow up|circle back|keep you posted)|keep you posted|report back|check back|working through that now)\b/i;

export function isPromiseLikeUserVisibleReply(text: string): boolean {
  return PROMISE_LIKE_REPLY_PATTERN.test(text.trim());
}

export function classifyUserVisibleReply(
  text: string,
  visibility: UserVisibleReplyVisibility
): UserVisibleReplyKind {
  const normalized = text.trim();
  if (!normalized) {
    return "none";
  }

  if (isPromiseLikeUserVisibleReply(normalized)) {
    return "promise";
  }

  return visibility === "final" ? "result" : "progress";
}

export interface AutoFollowUpDecisionInput {
  finalReplyKind: UserVisibleReplyKind;
  hasExplicitFollowUp: boolean;
  allToolsFailed: boolean;
  intermediatePromiseSent: boolean;
  intermediateInformationalTextSent: boolean;
  statusOnlyProgressSent: boolean;
  skipFinalSend: boolean;
}

export function shouldAutoScheduleFollowUp(
  input: AutoFollowUpDecisionInput
): boolean {
  if (input.hasExplicitFollowUp) {
    return false;
  }

  if (input.finalReplyKind === "promise") {
    return true;
  }

  if (input.allToolsFailed) {
    return true;
  }

  if (input.intermediatePromiseSent && input.finalReplyKind !== "result") {
    return true;
  }

  if (
    input.skipFinalSend &&
    input.statusOnlyProgressSent &&
    !input.intermediateInformationalTextSent
  ) {
    return true;
  }

  return false;
}
