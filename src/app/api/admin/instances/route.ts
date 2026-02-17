import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";
import { instanceFiltersSchema } from "@/lib/validators/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { getAdminInstances } from "@/lib/queries/admin-lists";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = instanceFiltersSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await getAdminInstances(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load instances") },
      { status: 500 }
    );
  }
}
