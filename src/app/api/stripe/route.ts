import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPortalSession } from "@/lib/stripe/client";

const createPortalSchema = z.object({
  action: z.literal("create-portal"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body && typeof body === "object" && "action" in body) {
    if ((body as { action?: string }).action === "create-portal") {
      const parsed = createPortalSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const adminSupabase = createAdminClient();
      const { data: customer } = await adminSupabase
        .from("customers")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .single();

      if (!customer?.stripe_customer_id) {
        return NextResponse.json(
          { error: "No billing account found" },
          { status: 404 }
        );
      }

      const session = await createPortalSession(customer.stripe_customer_id);
      return NextResponse.json({ url: session.url });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
