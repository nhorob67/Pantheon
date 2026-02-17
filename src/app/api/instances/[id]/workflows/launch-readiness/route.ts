import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { workflowLaunchReadinessQuerySchema } from "@/lib/validators/workflow";
import {
  isWorkflowBuilderEnabledForCustomer,
  WORKFLOW_BUILDER_DISABLED_MESSAGE,
} from "@/lib/workflows/feature-gate";
import { buildWorkflowLaunchReadinessSnapshot } from "@/lib/workflows/launch-readiness";

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
  const parsedQuery = workflowLaunchReadinessQuerySchema.safeParse({
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

  try {
    const snapshot = await buildWorkflowLaunchReadinessSnapshot(admin, {
      customerId: instance.customer_id,
      instanceId: instance.id,
      timeframeDays: parsedQuery.data.days,
      minSamplesPerMetric: parsedQuery.data.min_samples,
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load workflow launch readiness data") },
      { status: 500 }
    );
  }
}
