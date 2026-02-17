import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { recordTelemetryEvent } from "@/lib/queries/extensibility";
import {
  ingestWorkflowPerformanceMetricRequestSchema,
  workflowPerformanceSummaryQuerySchema,
} from "@/lib/validators/workflow";
import {
  evaluateWorkflowPerformanceGates,
  extractWorkflowWebVitalSamples,
  WORKFLOW_WEB_VITAL_EVENT_TYPE,
} from "@/lib/workflows/performance-gates";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";

type InstanceLookupRow = {
  id: string;
  customer_id: string;
  customers: { user_id: string } | { user_id: string }[] | null;
};

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

async function resolveAuthorizedInstance(instanceId: string): Promise<{
  instance: InstanceLookupRow | null;
  unauthorizedResponse: NextResponse | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      instance: null,
      unauthorizedResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, customers!inner(user_id)")
    .eq("id", instanceId)
    .single();

  const typedInstance = instance as InstanceLookupRow | null;
  if (!typedInstance || getCustomerUserId(typedInstance.customers) !== user.id) {
    return {
      instance: null,
      unauthorizedResponse: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  return { instance: typedInstance, unauthorizedResponse: null };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { instance, unauthorizedResponse } = await resolveAuthorizedInstance(id);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }
  if (!instance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    instance.customer_id
  );

  if (!workflowBuilderEnabled) {
    return NextResponse.json(
      { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  const rawBody = (await request.json().catch(() => null)) as unknown;
  const parsed = ingestWorkflowPerformanceMetricRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid metric payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await recordTelemetryEvent(admin, {
      customerId: instance.customer_id,
      instanceId: instance.id,
      eventType: WORKFLOW_WEB_VITAL_EVENT_TYPE,
      metadata: {
        metric_name: parsed.data.metric_name,
        route_kind: parsed.data.route_kind,
        value: parsed.data.value,
        id: parsed.data.id ?? null,
        rating: parsed.data.rating ?? null,
        delta: parsed.data.delta ?? null,
        navigation_type: parsed.data.navigation_type ?? null,
        path: parsed.data.path ?? null,
        source: parsed.data.source ?? "web-vitals",
        sampled_at: parsed.data.sampled_at ?? new Date().toISOString(),
      },
    });

    return NextResponse.json({ status: "accepted" }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to store workflow performance metric") },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { instance, unauthorizedResponse } = await resolveAuthorizedInstance(id);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }
  if (!instance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const query = new URL(request.url).searchParams;
  const parsedQuery = workflowPerformanceSummaryQuerySchema.safeParse({
    days: query.get("days") || undefined,
    min_samples: query.get("min_samples") || undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsedQuery.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    instance.customer_id
  );

  if (!workflowBuilderEnabled) {
    return NextResponse.json(
      { error: WORKFLOW_BUILDER_DISABLED_MESSAGE },
      { status: 403 }
    );
  }

  const since = new Date(Date.now() - parsedQuery.data.days * 24 * 60 * 60 * 1000);

  try {
    const { data, error } = await admin
      .from("telemetry_events")
      .select("created_at, metadata")
      .eq("customer_id", instance.customer_id)
      .eq("instance_id", instance.id)
      .eq("event_type", WORKFLOW_WEB_VITAL_EVENT_TYPE)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      return NextResponse.json(
        { error: safeErrorMessage(error, "Failed to load workflow performance metrics") },
        { status: 500 }
      );
    }

    const samples = extractWorkflowWebVitalSamples(data || []);
    const summary = evaluateWorkflowPerformanceGates({
      samples,
      timeframeDays: parsedQuery.data.days,
      minSamplesPerMetric: parsedQuery.data.min_samples,
    });

    return NextResponse.json({
      summary,
      captured_samples: samples.length,
      window_started_at: since.toISOString(),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to evaluate workflow performance gates") },
      { status: 500 }
    );
  }
}
