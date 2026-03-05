import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeOrFilterValue } from "@/lib/security/postgrest-sanitize";
import { safeErrorMessage } from "@/lib/security/safe-error";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const CREATED_AT_ID_CURSOR_DELIMITER = "|";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CreatedAtIdCursor {
  createdAt: string;
  id: string;
}

function parseLimit(value: string | null): number {
  if (!value) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

function parseOffset(value: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function decodeCreatedAtIdCursor(value: string | null): CreatedAtIdCursor | null {
  if (!value || value.length === 0) {
    return null;
  }

  const delimiterIndex = value.indexOf(CREATED_AT_ID_CURSOR_DELIMITER);
  if (delimiterIndex <= 0 || delimiterIndex >= value.length - 1) {
    return null;
  }

  const createdAt = value.slice(0, delimiterIndex);
  const id = value.slice(delimiterIndex + 1);
  if (id.includes(CREATED_AT_ID_CURSOR_DELIMITER)) {
    return null;
  }
  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) {
    return null;
  }
  if (!UUID_PATTERN.test(id)) {
    return null;
  }

  return { createdAt: new Date(createdAtMs).toISOString(), id };
}

function encodeCreatedAtIdCursor(row: { created_at: string; id: string }): string {
  const createdAtMs = Date.parse(row.created_at);
  const normalizedCreatedAt = Number.isNaN(createdAtMs)
    ? row.created_at
    : new Date(createdAtMs).toISOString();
  return `${normalizedCreatedAt}${CREATED_AT_ID_CURSOR_DELIMITER}${row.id}`;
}

function emptyAlertsResponse() {
  return NextResponse.json({
    alerts: [],
    total: 0,
    unacknowledged: 0,
    next_cursor: null,
  });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json(
      { error: safeErrorMessage(customerError, "Failed to load alerts") },
      { status: 500 }
    );
  }

  if (!customer) {
    return emptyAlertsResponse();
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseOffset(url.searchParams.get("offset"));
  const rawCursor = url.searchParams.get("cursor");
  const cursor = decodeCreatedAtIdCursor(rawCursor);

  if (rawCursor && !cursor) {
    return NextResponse.json(
      { error: "Invalid cursor format. Use created_at|id." },
      { status: 400 }
    );
  }

  let alertsQuery = supabase
    .from("alert_events")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (cursor) {
    const safeCreatedAt = sanitizeOrFilterValue(cursor.createdAt);
    const safeId = sanitizeOrFilterValue(cursor.id);
    alertsQuery = alertsQuery.or(
      `created_at.lt.${safeCreatedAt},and(created_at.eq.${safeCreatedAt},id.lt.${safeId})`
    );
  }

  const rangeStart = cursor ? 0 : offset;

  const [
    { data: alerts, error: alertsError },
    { count: totalCount, error: totalError },
    { count: unacknowledgedCount, error: unacknowledgedError },
  ] = await Promise.all([
    alertsQuery.range(rangeStart, rangeStart + limit),
    supabase
      .from("alert_events")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id),
    supabase
      .from("alert_events")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id)
      .eq("acknowledged", false),
  ]);

  if (alertsError || totalError || unacknowledgedError) {
    console.error(
      "[alerts] Falling back to empty alerts response:",
      safeErrorMessage(
        alertsError || totalError || unacknowledgedError,
        "Failed to load alerts"
      )
    );
    return emptyAlertsResponse();
  }

  const alertRows = alerts || [];
  const hasMore = alertRows.length > limit;
  const pageAlerts = alertRows.slice(0, limit);
  const nextCursor =
    hasMore && pageAlerts.length > 0
      ? encodeCreatedAtIdCursor(
          pageAlerts[pageAlerts.length - 1] as { created_at: string; id: string }
        )
      : null;

  return NextResponse.json({
    alerts: pageAlerts,
    total: totalCount || 0,
    unacknowledged: unacknowledgedCount || 0,
    next_cursor: nextCursor,
  });
}
