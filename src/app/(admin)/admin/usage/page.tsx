import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { redirect } from "next/navigation";
import { AdminUsageContent } from "@/components/admin/usage-content";
import {
  getUsageAnalytics,
  getRevenueBreakdown,
} from "@/lib/queries/admin-analytics";

export default async function AdminUsagePage() {
  const [supabase, admin] = await Promise.all([
    createClient(),
    Promise.resolve(createAdminClient()),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/dashboard");
  }
  const [usageData, revenueData] = await Promise.all([
    getUsageAnalytics(admin),
    getRevenueBreakdown(admin),
  ]);

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
        Usage & Revenue
      </h2>
      <AdminUsageContent
        daily={usageData.daily}
        topConsumers={usageData.top_consumers}
        revenue={revenueData}
      />
    </div>
  );
}
