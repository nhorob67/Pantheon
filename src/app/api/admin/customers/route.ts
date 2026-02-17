import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";
import { customerFiltersSchema } from "@/lib/validators/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { getAdminCustomers } from "@/lib/queries/admin-lists";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = customerFiltersSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await getAdminCustomers(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load customers") },
      { status: 500 }
    );
  }
}
