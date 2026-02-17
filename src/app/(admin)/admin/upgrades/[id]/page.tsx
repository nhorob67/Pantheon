import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UpgradeProgress } from "@/components/admin/upgrade-progress";
import { UpgradeInstanceTable } from "@/components/admin/upgrade-instance-table";
import type { UpgradeOperation } from "@/types/database";

export default async function UpgradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data: upgrade } = await admin
    .from("upgrade_operations")
    .select("*")
    .eq("id", id)
    .single();

  if (!upgrade) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/upgrades"
        className="flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to upgrades
      </Link>

      <div className="mb-6">
        <h2 className="font-headline text-2xl font-bold text-foreground mb-1">
          Upgrade to {upgrade.target_version}
        </h2>
        <p className="text-sm text-foreground/50 font-mono">
          {upgrade.docker_image}
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-4">
            Progress
          </h3>
          <UpgradeProgress
            upgradeId={id}
            initialUpgrade={upgrade as UpgradeOperation}
          />
        </div>

        <div>
          <h3 className="font-headline text-sm font-semibold text-foreground/60 uppercase tracking-wider mb-3">
            Instance Details
          </h3>
          <UpgradeInstanceTable upgradeId={id} />
        </div>
      </div>
    </div>
  );
}
