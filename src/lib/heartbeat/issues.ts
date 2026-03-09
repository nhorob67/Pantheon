import type { SupabaseClient } from "@supabase/supabase-js";
import type { HeartbeatExecutionConfig } from "./effective-configs";
import { prefixHeartbeatIssueSummary, type HeartbeatAlertSignal } from "./signals.ts";
import type {
  HeartbeatDeliveryStatus,
  HeartbeatIssue,
  HeartbeatIssueAttentionType,
  HeartbeatIssueState,
} from "@/types/heartbeat";

export interface HeartbeatIssueNotificationCandidate {
  issue: HeartbeatIssue;
  attentionType: HeartbeatIssueAttentionType;
  summary: string;
}

export interface HeartbeatIssuePlan {
  activeIssues: HeartbeatIssue[];
  newIssues: HeartbeatIssue[];
  updatedIssues: HeartbeatIssue[];
  resolvedIssueIds: string[];
  notificationCandidates: HeartbeatIssueNotificationCandidate[];
  suppressedReasons: string[];
}

export interface HeartbeatIssueDeliveryDecision {
  deliveryAttempted: boolean;
  deliveryStatus: HeartbeatDeliveryStatus;
  suppressedReason: string | null;
  summaries: string[];
  notificationCandidates: HeartbeatIssueNotificationCandidate[];
}

const ACTIVE_STATES = new Set<HeartbeatIssueState>([
  "new",
  "acknowledged",
  "snoozed",
]);

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeIssueForEvaluation(
  issue: HeartbeatIssue,
  now: Date
): HeartbeatIssue {
  if (issue.state !== "snoozed") {
    return issue;
  }

  const snoozedUntil = parseTimestamp(issue.snoozed_until);
  if (snoozedUntil === null || snoozedUntil > now.getTime()) {
    return issue;
  }

  return {
    ...issue,
    state: "acknowledged",
    snoozed_until: null,
  };
}

function createHeartbeatIssue(input: {
  config: HeartbeatExecutionConfig;
  signal: HeartbeatAlertSignal;
  now: Date;
}): HeartbeatIssue {
  const nowIso = input.now.toISOString();

  return {
    id: `new:${input.signal.fingerprint}`,
    tenant_id: input.config.tenant_id,
    config_id: input.config.id,
    customer_id: input.config.customer_id,
    agent_id: input.config.agent_id,
    signal_type: input.signal.key,
    fingerprint: input.signal.fingerprint,
    severity: input.signal.severity,
    state: "new",
    summary: input.signal.summary,
    payload: input.signal.data ?? {},
    first_seen_at: nowIso,
    last_seen_at: nowIso,
    last_notified_at: null,
    last_notification_kind: null,
    snoozed_until: null,
    resolved_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

function getReminderDue(input: {
  lastNotifiedAt: string | null;
  reminderIntervalMinutes: number;
  now: Date;
}): boolean {
  const lastNotifiedMs = parseTimestamp(input.lastNotifiedAt);
  if (lastNotifiedMs === null) {
    return false;
  }

  return (
    input.now.getTime() - lastNotifiedMs
    >= input.reminderIntervalMinutes * 60 * 1000
  );
}

function getWithinCooldown(input: {
  lastNotifiedAt: string | null;
  cooldownMinutes: number;
  now: Date;
}): boolean {
  const lastNotifiedMs = parseTimestamp(input.lastNotifiedAt);
  if (lastNotifiedMs === null) {
    return false;
  }

  return (
    input.now.getTime() - lastNotifiedMs
    < input.cooldownMinutes * 60 * 1000
  );
}

function summarizeSuppressedReason(reasons: string[]): string {
  if (reasons.length === 0) {
    return "issue_state_suppressed";
  }

  const priority = [
    "issue_snoozed",
    "acknowledged_waiting_reminder",
    "reminder_not_due",
    "cooldown_duplicate",
  ];

  for (const key of priority) {
    if (reasons.includes(key)) {
      return key;
    }
  }

  return reasons[0] as string;
}

function isUrgentHeartbeatIssue(issue: Pick<HeartbeatIssue, "signal_type" | "severity">): boolean {
  return issue.signal_type === "weather_severe" && issue.severity >= 4;
}

function getPendingIssueReferenceTime(
  issue: Pick<HeartbeatIssue, "first_seen_at" | "last_notified_at">
): number | null {
  return parseTimestamp(issue.last_notified_at) ?? parseTimestamp(issue.first_seen_at);
}

export async function fetchActiveHeartbeatIssues(
  admin: SupabaseClient,
  configId: string
): Promise<HeartbeatIssue[]> {
  const { data, error } = await admin
    .from("tenant_heartbeat_signals")
    .select("*")
    .eq("config_id", configId)
    .is("resolved_at", null)
    .order("severity", { ascending: false })
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as HeartbeatIssue[]).filter((issue) =>
    ACTIVE_STATES.has(issue.state)
  );
}

export function buildHeartbeatIssuePlan(input: {
  config: HeartbeatExecutionConfig;
  existingIssues: HeartbeatIssue[];
  alertSignals: HeartbeatAlertSignal[];
  now: Date;
}): HeartbeatIssuePlan {
  const existingByFingerprint = new Map(
    input.existingIssues.map((issue) => [
      issue.fingerprint,
      normalizeIssueForEvaluation(issue, input.now),
    ])
  );
  const seenFingerprints = new Set<string>();
  const activeIssues: HeartbeatIssue[] = [];
  const newIssues: HeartbeatIssue[] = [];
  const updatedIssues: HeartbeatIssue[] = [];
  const resolvedIssueIds: string[] = [];
  const notificationCandidates: HeartbeatIssueNotificationCandidate[] = [];
  const suppressedReasons: string[] = [];

  for (const signal of input.alertSignals) {
    seenFingerprints.add(signal.fingerprint);

    const existingIssue = existingByFingerprint.get(signal.fingerprint) || null;
    const issue = existingIssue
      ? {
          ...existingIssue,
          signal_type: signal.key,
          summary: signal.summary,
          payload: signal.data ?? {},
          severity: signal.severity,
          last_seen_at: input.now.toISOString(),
          updated_at: input.now.toISOString(),
        }
      : createHeartbeatIssue({
          config: input.config,
          signal,
          now: input.now,
        });

    activeIssues.push(issue);
    if (existingIssue) {
      updatedIssues.push(issue);
    } else {
      newIssues.push(issue);
    }

    if (
      issue.state === "snoozed"
      && issue.snoozed_until
      && parseTimestamp(issue.snoozed_until) !== null
      && (parseTimestamp(issue.snoozed_until) as number) > input.now.getTime()
    ) {
      suppressedReasons.push("issue_snoozed");
      continue;
    }

    const worsened = existingIssue ? issue.severity > existingIssue.severity : false;
    const withinCooldown = getWithinCooldown({
      lastNotifiedAt: issue.last_notified_at,
      cooldownMinutes: input.config.cooldown_minutes,
      now: input.now,
    });
    const reminderDue = getReminderDue({
      lastNotifiedAt: issue.last_notified_at,
      reminderIntervalMinutes: input.config.reminder_interval_minutes,
      now: input.now,
    });

    let attentionType: HeartbeatIssueAttentionType | null = null;
    if (!issue.last_notified_at) {
      attentionType = "new_issue";
    } else if (worsened) {
      attentionType = "worsened";
    } else if (withinCooldown) {
      suppressedReasons.push("cooldown_duplicate");
    } else if (reminderDue) {
      attentionType = "reminder";
    } else if (issue.state === "acknowledged") {
      suppressedReasons.push("acknowledged_waiting_reminder");
    } else {
      suppressedReasons.push("reminder_not_due");
    }

    if (attentionType) {
      notificationCandidates.push({
        issue,
        attentionType,
        summary: prefixHeartbeatIssueSummary(
          attentionType,
          issue.summary || signal.key.replaceAll("_", " ")
        ),
      });
    }
  }

  for (const issue of input.existingIssues) {
    if (!seenFingerprints.has(issue.fingerprint)) {
      resolvedIssueIds.push(issue.id);
    }
  }

  return {
    activeIssues,
    newIssues,
    updatedIssues,
    resolvedIssueIds,
    notificationCandidates,
    suppressedReasons,
  };
}

export function decideHeartbeatIssueDelivery(input: {
  hasSignal: boolean;
  deliveryChannelId: string | null;
  maxAlertsPerDay: number;
  recentDeliveryCount: number;
  plan: HeartbeatIssuePlan;
  digestEnabled: boolean;
  digestWindowMinutes: number;
  now: Date;
  busyRuntimeReason?: string | null;
}): HeartbeatIssueDeliveryDecision {
  if (!input.hasSignal) {
    return {
      deliveryAttempted: false,
      deliveryStatus: "not_applicable",
      suppressedReason: null,
      summaries: [],
      notificationCandidates: [],
    };
  }

  if (!input.deliveryChannelId) {
    return {
      deliveryAttempted: false,
      deliveryStatus: "suppressed",
      suppressedReason: "missing_delivery_channel",
      summaries: [],
      notificationCandidates: [],
    };
  }

  if (input.plan.notificationCandidates.length === 0) {
    return {
      deliveryAttempted: false,
      deliveryStatus: "suppressed",
      suppressedReason: summarizeSuppressedReason(input.plan.suppressedReasons),
      summaries: [],
      notificationCandidates: [],
    };
  }

  const urgentCandidates = input.plan.notificationCandidates.filter((candidate) =>
    isUrgentHeartbeatIssue(candidate.issue)
  );
  const nonUrgentCandidates = input.plan.notificationCandidates.filter((candidate) =>
    !isUrgentHeartbeatIssue(candidate.issue)
  );
  const notificationCandidates = input.busyRuntimeReason && urgentCandidates.length > 0
    ? urgentCandidates
    : input.plan.notificationCandidates;

  if (input.busyRuntimeReason && urgentCandidates.length === 0) {
    return {
      deliveryAttempted: false,
      deliveryStatus: "deferred",
      suppressedReason: input.busyRuntimeReason,
      summaries: [],
      notificationCandidates: [],
    };
  }

  if (input.digestEnabled && nonUrgentCandidates.length > 0) {
    const oldestPendingMs = nonUrgentCandidates.reduce<number | null>((oldest, candidate) => {
      const referenceMs = getPendingIssueReferenceTime(candidate.issue);
      if (referenceMs === null) {
        return oldest;
      }

      if (oldest === null) {
        return referenceMs;
      }

      return Math.min(oldest, referenceMs);
    }, null);

    const digestWindowOpen = oldestPendingMs !== null
      && input.now.getTime() - oldestPendingMs < input.digestWindowMinutes * 60 * 1000;

    if (digestWindowOpen && urgentCandidates.length === 0) {
      return {
        deliveryAttempted: false,
        deliveryStatus: "deferred",
        suppressedReason: "digest_window_open",
        summaries: [],
        notificationCandidates: [],
      };
    }

    if (digestWindowOpen && urgentCandidates.length > 0) {
      return {
        deliveryAttempted: true,
        deliveryStatus: "queued",
        suppressedReason: null,
        summaries: urgentCandidates.map((candidate) => candidate.summary),
        notificationCandidates: urgentCandidates,
      };
    }
  }

  if (input.recentDeliveryCount >= input.maxAlertsPerDay) {
    return {
      deliveryAttempted: false,
      deliveryStatus: "suppressed",
      suppressedReason: "max_alerts_per_day_reached",
      summaries: [],
      notificationCandidates: [],
    };
  }

  return {
    deliveryAttempted: true,
    deliveryStatus: "queued",
    suppressedReason: null,
    summaries: notificationCandidates.map((candidate) => candidate.summary),
    notificationCandidates,
  };
}

export async function applyHeartbeatIssuePlan(input: {
  admin: SupabaseClient;
  plan: HeartbeatIssuePlan;
  deliveryDecision: HeartbeatIssueDeliveryDecision;
  now: Date;
}): Promise<void> {
  const notifiedByFingerprint = new Map(
    input.deliveryDecision.notificationCandidates.map((candidate) => [
      candidate.issue.fingerprint,
      candidate.attentionType,
    ])
  );
  const nowIso = input.now.toISOString();

  if (input.plan.resolvedIssueIds.length > 0) {
    await input.admin
      .from("tenant_heartbeat_signals")
      .update({
        state: "resolved",
        resolved_at: nowIso,
        snoozed_until: null,
      })
      .in("id", input.plan.resolvedIssueIds);
  }

  for (const issue of input.plan.updatedIssues) {
    const attentionType = notifiedByFingerprint.get(issue.fingerprint) || null;
    await input.admin
      .from("tenant_heartbeat_signals")
      .update({
        signal_type: issue.signal_type,
        severity: issue.severity,
        state: issue.state,
        summary: issue.summary,
        payload: issue.payload ?? {},
        last_seen_at: issue.last_seen_at,
        snoozed_until: issue.snoozed_until,
        last_notified_at: attentionType ? nowIso : issue.last_notified_at,
        last_notification_kind: attentionType ?? issue.last_notification_kind,
        resolved_at: null,
      })
      .eq("id", issue.id);
  }

  if (input.plan.newIssues.length > 0) {
    await input.admin
      .from("tenant_heartbeat_signals")
      .insert(
        input.plan.newIssues.map((issue) => {
          const attentionType = notifiedByFingerprint.get(issue.fingerprint) || null;

          return {
            tenant_id: issue.tenant_id,
            config_id: issue.config_id,
            customer_id: issue.customer_id,
            agent_id: issue.agent_id,
            signal_type: issue.signal_type,
            fingerprint: issue.fingerprint,
            severity: issue.severity,
            state: issue.state,
            summary: issue.summary,
            payload: issue.payload ?? {},
            first_seen_at: issue.first_seen_at,
            last_seen_at: issue.last_seen_at,
            last_notified_at: attentionType ? nowIso : null,
            last_notification_kind: attentionType,
            snoozed_until: issue.snoozed_until,
            resolved_at: null,
          };
        })
      );
  }
}
