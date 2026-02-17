interface CronTimeParts {
  minute: number;
  hour: number;
  dayOfMonth: number;
  month: number;
  dayOfWeek: number;
}

interface ParseCronExpressionResult {
  fields: [string, string, string, string, string] | null;
  normalized: string;
}

export interface WorkflowScheduleTrigger {
  trigger_node_id: string;
  cron: string;
  timezone: string;
}

export const DEFAULT_WORKFLOW_SCHEDULE_CRON = "0 6 * * *";
export const DEFAULT_WORKFLOW_SCHEDULE_TIMEZONE = "UTC";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function parseCronExpression(cronExpression: string): ParseCronExpressionResult {
  const normalized = cronExpression.trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ");
  if (parts.length !== 5) {
    return { fields: null, normalized };
  }

  return {
    fields: [
      parts[0] as string,
      parts[1] as string,
      parts[2] as string,
      parts[3] as string,
      parts[4] as string,
    ],
    normalized,
  };
}

function normalizeFieldValue(
  value: number,
  options?: { allowSundaySeven?: boolean }
): number {
  if (options?.allowSundaySeven && value === 7) {
    return 0;
  }
  return value;
}

function expandCronField(
  field: string,
  min: number,
  max: number,
  options?: { allowSundaySeven?: boolean; normalizedMax?: number }
): Set<number> | null {
  const result = new Set<number>();
  const segments = field.split(",");

  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (segment.length === 0) {
      return null;
    }

    const slashParts = segment.split("/");
    if (slashParts.length > 2) {
      return null;
    }

    const base = slashParts[0] as string;
    const hasStep = slashParts.length === 2;
    let step = 1;
    if (hasStep) {
      const parsedStep = parseInteger((slashParts[1] || "").trim());
      if (parsedStep === null || parsedStep <= 0) {
        return null;
      }
      step = parsedStep;
    }

    let rangeStart: number;
    let rangeEnd: number;

    if (base === "*") {
      rangeStart = min;
      rangeEnd = max;
    } else if (base.includes("-")) {
      const rangeParts = base.split("-");
      if (rangeParts.length !== 2) {
        return null;
      }

      const start = parseInteger((rangeParts[0] || "").trim());
      const end = parseInteger((rangeParts[1] || "").trim());
      if (start === null || end === null) {
        return null;
      }
      if (start < min || end > max || start > end) {
        return null;
      }

      rangeStart = start;
      rangeEnd = end;
    } else {
      const parsedValue = parseInteger(base);
      if (parsedValue === null) {
        return null;
      }
      if (parsedValue < min || parsedValue > max) {
        return null;
      }

      rangeStart = parsedValue;
      rangeEnd = hasStep ? max : parsedValue;
    }

    for (let value = rangeStart; value <= rangeEnd; value += step) {
      const normalized = normalizeFieldValue(value, options);
      const normalizedUpperBound = options?.normalizedMax ?? max;
      if (normalized < min || normalized > normalizedUpperBound) {
        return null;
      }
      result.add(normalized);
    }
  }

  return result;
}

function isFieldUnrestricted(
  allowedValues: Set<number>,
  min: number,
  max: number
): boolean {
  if (allowedValues.size !== max - min + 1) {
    return false;
  }

  for (let value = min; value <= max; value += 1) {
    if (!allowedValues.has(value)) {
      return false;
    }
  }

  return true;
}

function getCronTimeParts(date: Date, timezone: string): CronTimeParts | null {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      hourCycle: "h23",
      minute: "2-digit",
      hour: "2-digit",
      day: "2-digit",
      month: "2-digit",
      weekday: "short",
    });
  } catch {
    return null;
  }

  const parts = formatter.formatToParts(date);
  const minutePart = parts.find((part) => part.type === "minute")?.value;
  const hourPart = parts.find((part) => part.type === "hour")?.value;
  const dayPart = parts.find((part) => part.type === "day")?.value;
  const monthPart = parts.find((part) => part.type === "month")?.value;
  const weekdayPart = parts.find((part) => part.type === "weekday")?.value;

  const minute = minutePart ? Number(minutePart) : NaN;
  const hour = hourPart ? Number(hourPart) : NaN;
  const dayOfMonth = dayPart ? Number(dayPart) : NaN;
  const month = monthPart ? Number(monthPart) : NaN;
  const dayOfWeek =
    weekdayPart && WEEKDAY_MAP[weekdayPart] !== undefined
      ? WEEKDAY_MAP[weekdayPart]
      : NaN;

  if (
    !Number.isInteger(minute) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(dayOfMonth) ||
    !Number.isInteger(month) ||
    !Number.isInteger(dayOfWeek)
  ) {
    return null;
  }

  return {
    minute,
    hour,
    dayOfMonth,
    month,
    dayOfWeek,
  };
}

export function floorDateToUtcMinute(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 60000) * 60000);
}

export function buildScheduledRunCorrelationId(
  workflowId: string,
  sourceVersion: number,
  slotUtc: string
): string {
  return `workflow-schedule:${workflowId}:v${sourceVersion}:${slotUtc}`;
}

export function isCronDueAt(
  cronExpression: string,
  timezone: string,
  at: Date
): { due: boolean; invalid: boolean } {
  const { fields } = parseCronExpression(cronExpression);
  if (!fields) {
    return { due: false, invalid: true };
  }

  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] =
    fields;

  const minuteValues = expandCronField(minuteField, 0, 59);
  const hourValues = expandCronField(hourField, 0, 23);
  const dayOfMonthValues = expandCronField(dayOfMonthField, 1, 31);
  const monthValues = expandCronField(monthField, 1, 12);
  const dayOfWeekValues = expandCronField(dayOfWeekField, 0, 7, {
    allowSundaySeven: true,
    normalizedMax: 6,
  });

  if (
    !minuteValues ||
    !hourValues ||
    !dayOfMonthValues ||
    !monthValues ||
    !dayOfWeekValues
  ) {
    return { due: false, invalid: true };
  }

  const timeParts = getCronTimeParts(at, timezone);
  if (!timeParts) {
    return { due: false, invalid: true };
  }

  const minuteMatch = minuteValues.has(timeParts.minute);
  const hourMatch = hourValues.has(timeParts.hour);
  const monthMatch = monthValues.has(timeParts.month);
  const dayOfMonthMatch = dayOfMonthValues.has(timeParts.dayOfMonth);
  const dayOfWeekMatch = dayOfWeekValues.has(timeParts.dayOfWeek);

  const dayOfMonthUnrestricted = isFieldUnrestricted(dayOfMonthValues, 1, 31);
  const dayOfWeekUnrestricted = isFieldUnrestricted(dayOfWeekValues, 0, 6);

  let dayMatch = false;
  if (dayOfMonthUnrestricted && dayOfWeekUnrestricted) {
    dayMatch = true;
  } else if (dayOfMonthUnrestricted) {
    dayMatch = dayOfWeekMatch;
  } else if (dayOfWeekUnrestricted) {
    dayMatch = dayOfMonthMatch;
  } else {
    // Cron semantics: when both fields are restricted, either may match.
    dayMatch = dayOfMonthMatch || dayOfWeekMatch;
  }

  return {
    due: minuteMatch && hourMatch && monthMatch && dayMatch,
    invalid: false,
  };
}

export function resolveScheduledTrigger(
  graph: unknown
): WorkflowScheduleTrigger | null {
  if (!graph || typeof graph !== "object") {
    return null;
  }

  const nodes = (graph as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    return null;
  }

  const triggerNode = nodes
    .filter(
      (node) =>
        typeof node === "object" &&
        node !== null &&
        (node as { type?: unknown }).type === "trigger" &&
        typeof (node as { id?: unknown }).id === "string"
    )
    .map(
      (node) =>
        node as {
          id: string;
          config?: Record<string, unknown>;
        }
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];

  if (!triggerNode) {
    return null;
  }

  const config =
    triggerNode.config && typeof triggerNode.config === "object"
      ? triggerNode.config
      : {};
  const triggerKindRaw = config.trigger_kind;
  const triggerKind =
    typeof triggerKindRaw === "string" ? triggerKindRaw.toLowerCase() : "manual";

  if (triggerKind !== "schedule") {
    return null;
  }

  const cron =
    typeof config.cron === "string" && config.cron.trim().length > 0
      ? config.cron.trim()
      : DEFAULT_WORKFLOW_SCHEDULE_CRON;
  const timezone =
    typeof config.timezone === "string" && config.timezone.trim().length > 0
      ? config.timezone.trim()
      : DEFAULT_WORKFLOW_SCHEDULE_TIMEZONE;

  return {
    trigger_node_id: triggerNode.id,
    cron,
    timezone,
  };
}
