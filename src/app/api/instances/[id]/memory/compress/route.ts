import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { memoryOperationRequestSchema } from "@/lib/validators/memory";
import { resolveRequestTraceIdFromHeaders } from "@/lib/runtime/request-trace";
import {
  shouldBridgeInstanceWrite,
  withInstanceBridgeHeaders,
} from "@/lib/runtime/instance-bridge";
import { resolveTenantRuntimeGateState } from "@/lib/runtime/tenant-runtime-gates";
import { resolveTenantIdForInstance } from "@/lib/runtime/tenant-agents";
import {
  buildTenantMemoryContext,
  queueTenantMemoryOperation,
  TenantMemoryServiceError,
} from "@/lib/runtime/tenant-memory";

function getCustomerUserId(
  customers: { user_id: string } | { user_id: string }[] | null
): string | null {
  if (!customers) {
    return null;
  }

  if (Array.isArray(customers)) {
    return customers[0]?.user_id ?? null;
  }

  return customers.user_id ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestTraceId = resolveRequestTraceIdFromHeaders(request.headers);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await consumeConfigUpdateRateLimit(user.id);
  if (rateLimit === "unavailable") {
    return NextResponse.json(
      { error: "Rate limiter unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  if (rateLimit === "blocked") {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || getCustomerUserId(instance.customers) !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = memoryOperationRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const runtimeGates = await resolveTenantRuntimeGateState(
    admin,
    instance.customer_id
  );

  const tenantId = runtimeGates.writes_enabled
    ? await resolveTenantIdForInstance(admin, id)
    : null;
  if (shouldBridgeInstanceWrite(runtimeGates, tenantId)) {
    if (runtimeGates.memory_writes_paused) {
      return NextResponse.json(
        { error: "Tenant runtime memory writes are currently paused" },
        { status: 409 }
      );
    }

    try {
      const context = buildTenantMemoryContext(
        tenantId,
        instance.customer_id,
        id
      );
      const operation = await queueTenantMemoryOperation(
        admin,
        context,
        "compress",
        user.email || user.id,
        parsed.data.reason
      );
      const response = NextResponse.json({ operation }, { status: 202 });
      return withInstanceBridgeHeaders(response, tenantId, requestTraceId);
    } catch (error) {
      if (error instanceof TenantMemoryServiceError) {
        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.status }
        );
      }

      return NextResponse.json(
        { error: safeErrorMessage(error, "Failed to queue bridged tenant memory compression") },
        { status: 500 }
      );
    }
  }

  const { data: operation, error } = await admin
    .from("memory_operations")
    .insert({
      instance_id: id,
      customer_id: instance.customer_id,
      operation_type: "compress",
      status: "queued",
      requested_by: user.email || user.id,
      input: parsed.data.reason ? { reason: parsed.data.reason } : {},
    })
    .select("id, operation_type, status, queued_at")
    .single();

  if (error || !operation) {
    return NextResponse.json(
      { error: error?.message || "Failed to queue operation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ operation }, { status: 202 });
}
