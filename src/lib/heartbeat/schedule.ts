function parseHeartbeatTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isInteger(hour)
    || !Number.isInteger(minute)
    || hour < 0
    || hour > 23
    || minute < 0
    || minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function getLocalMinutesSinceMidnight(date: Date, timezone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      return null;
    }

    return hour * 60 + minute;
  } catch {
    return null;
  }
}

export function isWithinHeartbeatActiveHours(
  timezone: string,
  start: string,
  end: string,
  at: Date = new Date()
): boolean {
  const startMinutes = parseHeartbeatTime(start);
  const endMinutes = parseHeartbeatTime(end);
  const currentMinutes = getLocalMinutesSinceMidnight(at, timezone);

  if (startMinutes === null || endMinutes === null || currentMinutes === null) {
    return true;
  }

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function computeHeartbeatNextRunAt(
  intervalMinutes: number,
  from: Date = new Date()
): string {
  return new Date(from.getTime() + intervalMinutes * 60 * 1000).toISOString();
}

export function formatHeartbeatLocalTime(
  isoTimestamp: string | null,
  timezone: string
): string | null {
  if (!isoTimestamp) {
    return null;
  }

  try {
    return new Date(isoTimestamp).toLocaleString("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return isoTimestamp;
  }
}
