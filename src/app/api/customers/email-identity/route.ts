import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeConfigUpdateRateLimit } from "@/lib/security/user-rate-limit";
import {
  EmailIdentityConflictError,
  EmailIdentityNotFoundError,
  ensureEmailIdentity,
  getActiveEmailIdentity,
  updateEmailIdentitySlug,
} from "@/lib/email/identity";
import { ensureAgentMailInboxForIdentity } from "@/lib/email/agentmail-identity";
import {
  AgentMailConfigurationError,
  AgentMailRequestError,
} from "@/lib/email/providers/agentmail";
import { updateEmailIdentitySchema } from "@/lib/validators/email";
import { safeErrorMessage } from "@/lib/security/safe-error";

async function loadCustomerForUser(userId: string) {
  const admin = createAdminClient();
  const { data: customer, error } = await admin
    .from("customers")
    .select("id, email")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return customer;
}

async function loadIdentityContext(customerId: string) {
  const admin = createAdminClient();
  const [{ data: profile, error: profileError }, { data: instance, error: instanceError }] =
    await Promise.all([
      admin
        .from("farm_profiles")
        .select("farm_name")
        .eq("customer_id", customerId)
        .maybeSingle(),
      admin
        .from("instances")
        .select("id")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (instanceError) {
    throw new Error(instanceError.message);
  }

  return {
    farmName: profile?.farm_name || null,
    instanceId: instance?.id || null,
  };
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
    const customer = await loadCustomerForUser(user.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const identity = await getActiveEmailIdentity(customer.id);

    return NextResponse.json({ identity });
  } catch (err) {
    return NextResponse.json(
      { error: safeErrorMessage(err, "Failed to load email identity") },
      { status: 500 }
    );
  }
}

export async function POST() {
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

  try {
    const customer = await loadCustomerForUser(user.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { farmName, instanceId } = await loadIdentityContext(customer.id);
    const identity = await ensureEmailIdentity({
      customerId: customer.id,
      instanceId,
      farmName,
      customerEmail: customer.email || null,
    });

    const linkedIdentity = await ensureAgentMailInboxForIdentity(identity);

    return NextResponse.json({ identity: linkedIdentity });
  } catch (err) {
    if (err instanceof AgentMailConfigurationError) {
      return NextResponse.json(
        { error: safeErrorMessage(err, "Email configuration error") },
        { status: 500 }
      );
    }

    if (err instanceof AgentMailRequestError) {
      return NextResponse.json(
        { error: "Failed to provision AgentMail inbox" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: safeErrorMessage(err, "Failed to enable email identity") },
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
  const parsed = updateEmailIdentitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const customer = await loadCustomerForUser(user.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { instanceId } = await loadIdentityContext(customer.id);
    const identity = await updateEmailIdentitySlug({
      customerId: customer.id,
      slug: parsed.data.slug,
      instanceId,
    });

    return NextResponse.json({ identity });
  } catch (err) {
    if (err instanceof EmailIdentityConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    if (err instanceof EmailIdentityNotFoundError) {
      return NextResponse.json({ error: "Enable email first" }, { status: 404 });
    }

    return NextResponse.json(
      { error: safeErrorMessage(err, "Failed to update email identity") },
      { status: 500 }
    );
  }
}
