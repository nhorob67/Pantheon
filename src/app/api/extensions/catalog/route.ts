import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extensionCatalogFiltersSchema } from "@/lib/validators/extensibility";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { listExtensionCatalog } from "@/lib/queries/extensibility-catalog";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = extensionCatalogFiltersSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await listExtensionCatalog(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load extension catalog") },
      { status: 500 }
    );
  }
}
