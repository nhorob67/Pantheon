import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { AlertsList } from "@/components/alerts/alerts-list";
import type { AlertEvent } from "@/types/alerts";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-headline text-2xl font-semibold text-foreground">
          Alerts
        </h2>
        <p className="text-foreground/60 text-sm mt-1">
          Spending alerts, proactive notifications, and system events.
        </p>
      </div>

      <Suspense fallback={<AlertsSkeleton />}>
        <AlertsContent customerId={customerId} />
      </Suspense>
    </div>
  );
}

async function AlertsContent({ customerId }: { customerId: string }) {
  const supabase = await createClient();

  const [{ data: alerts }, { count: total }] = await Promise.all([
    supabase
      .from("alert_events")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("alert_events")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
  ]);

  return (
    <AlertsList
      initialAlerts={(alerts || []) as AlertEvent[]}
      total={total || 0}
    />
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
    </div>
  );
}
