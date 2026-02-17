import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveEmailIdentity } from "@/lib/email/identity";

const CUSTOMER_SELECT_COLUMNS =
  "id, user_id, email, stripe_customer_id, stripe_subscription_id, subscription_status, plan, spending_cap_cents, spending_cap_auto_pause, alert_email, created_at, updated_at";

async function maybeGetCustomerIdentity(customerId: string) {
  try {
    return await getActiveEmailIdentity(customerId);
  } catch (err) {
    console.error("Failed to load active email identity:", err);
    return null;
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // 1. Fast path: find by user_id
  const { data: byUserId } = await adminSupabase
    .from("customers")
    .select(CUSTOMER_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .single();

  if (byUserId) {
    const identity = await maybeGetCustomerIdentity(byUserId.id);
    return NextResponse.json({
      customer_id: byUserId.id,
      customer: byUserId,
      email_identity: identity,
    });
  }

  // 2. Stripe webhook created a record by email before user authenticated — link user_id
  const { data: byEmail } = await adminSupabase
    .from("customers")
    .select(CUSTOMER_SELECT_COLUMNS)
    .eq("email", user.email!)
    .is("user_id", null)
    .single();

  if (byEmail) {
    await adminSupabase
      .from("customers")
      .update({ user_id: user.id })
      .eq("id", byEmail.id);

    const identity = await maybeGetCustomerIdentity(byEmail.id);

    return NextResponse.json({
      customer_id: byEmail.id,
      customer: { ...byEmail, user_id: user.id },
      email_identity: identity,
    });
  }

  // 3. Edge case: no record yet — create one with incomplete status
  const { data: newCustomer, error } = await adminSupabase
    .from("customers")
    .insert({
      user_id: user.id,
      email: user.email,
      subscription_status: "incomplete",
      plan: "standard",
    })
    .select(CUSTOMER_SELECT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create customer record" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    customer_id: newCustomer.id,
    customer: newCustomer,
    email_identity: await maybeGetCustomerIdentity(newCustomer.id),
  });
}
