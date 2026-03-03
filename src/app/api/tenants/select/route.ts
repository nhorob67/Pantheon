import { NextResponse } from "next/server";
import { z } from "zod/v4";
import {
  requireDashboardCustomer,
  TENANT_SELECTION_COOKIE_NAME,
} from "@/lib/auth/dashboard-session";
import { createClient } from "@/lib/supabase/server";

const selectTenantSchema = z
  .object({
    tenant_id: z.uuid(),
  })
  .strict();

export async function POST(request: Request) {
  const { customerId } = await requireDashboardCustomer();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = selectTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("customer_id", customerId)
    .eq("id", parsed.data.tenant_id)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const response = NextResponse.json(
    {
      ok: true,
      tenant_id: parsed.data.tenant_id,
    },
    { status: 200 }
  );
  response.cookies.set(TENANT_SELECTION_COOKIE_NAME, parsed.data.tenant_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}
