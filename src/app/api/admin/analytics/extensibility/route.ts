import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { getExtensibilityTelemetry } from "@/lib/queries/admin-analytics";
import { safeErrorMessage } from "@/lib/security/safe-error";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const data = await getExtensibilityTelemetry(admin);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load extensibility telemetry") },
      { status: 500 }
    );
  }
}
