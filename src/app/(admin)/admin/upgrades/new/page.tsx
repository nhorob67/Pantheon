import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UpgradeForm } from "@/components/admin/upgrade-form";

export default async function NewUpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("instances")
    .select("id", { count: "exact", head: true })
    .eq("status", "running");

  return (
    <div>
      <Link
        href="/admin/upgrades"
        className="flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to upgrades
      </Link>

      <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
        New Upgrade
      </h2>

      <UpgradeForm runningInstanceCount={count || 0} />
    </div>
  );
}
