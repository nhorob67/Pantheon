import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { syncModelCatalog } from "@/lib/ai/catalog-sync";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") as "anthropic" | "openrouter" | null;

  if (provider && provider !== "anthropic" && provider !== "openrouter") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  if (provider) {
    const result = await syncModelCatalog(admin, provider);
    return NextResponse.json({ [provider]: result });
  }

  const [anthropicResult, openrouterResult] = await Promise.all([
    syncModelCatalog(admin, "anthropic"),
    syncModelCatalog(admin, "openrouter"),
  ]);

  return NextResponse.json({
    anthropic: anthropicResult,
    openrouter: openrouterResult,
  });
}
