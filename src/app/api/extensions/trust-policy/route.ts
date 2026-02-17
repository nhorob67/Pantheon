import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  loadCustomerExtensionTrustPolicy,
  normalizeExtensionTrustPolicy,
  upsertCustomerExtensionTrustPolicy,
} from "@/lib/extensions/trust-policy";
import { extensionTrustPolicyUpdateSchema } from "@/lib/validators/extensibility";

interface CustomerContext {
  id: string;
}

async function loadCustomerContext(userId: string): Promise<CustomerContext | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customer = await loadCustomerContext(user.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const policy = await loadCustomerExtensionTrustPolicy(admin, customer.id);

    return NextResponse.json({ policy });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load extension trust policy") },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = extensionTrustPolicyUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const customer = await loadCustomerContext(user.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const updated = await upsertCustomerExtensionTrustPolicy(admin, {
      customerId: customer.id,
      allowedSourceTypes: parsed.data.allowed_source_types,
      requireVerifiedSourceTypes: parsed.data.require_verified_source_types,
      updatedBy: user.email || null,
    });

    auditLog({
      action: "extension.trust_policy.updated",
      actor: user.email || user.id,
      resource_type: "customer",
      resource_id: customer.id,
      details: {
        allowed_source_types: updated.allowed_source_types,
        require_verified_source_types: updated.require_verified_source_types,
      },
    });

    return NextResponse.json({
      policy: normalizeExtensionTrustPolicy(updated),
      updated_by: updated.updated_by,
      updated_at: updated.updated_at,
    });
  } catch (error) {
    const message = safeErrorMessage(error, "Failed to update extension trust policy");
    const status =
      typeof message === "string" &&
      message.includes("schema is unavailable")
        ? 503
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
