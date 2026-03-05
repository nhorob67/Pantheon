import { Suspense } from "react";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";
import { UsageData } from "./_components/usage-data";

export default async function UsagePage() {
  const { customerId } = await requireDashboardCustomer();

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="font-headline text-2xl font-semibold text-foreground">
          API Usage
        </h2>
        <p className="text-foreground/60 text-sm mt-1">
          Token consumption, cost estimates, and projections for the current
          billing period.
        </p>
      </div>

      <Suspense fallback={<UsageSkeleton />}>
        <UsageData customerId={customerId} />
      </Suspense>
    </div>
  );
}

function UsageSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-40 rounded-xl bg-foreground/5 animate-pulse" />
        <div className="h-40 rounded-xl bg-foreground/5 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-xl bg-foreground/5 animate-pulse" />
        <div className="h-72 rounded-xl bg-foreground/5 animate-pulse" />
      </div>
      <div className="h-48 rounded-xl bg-foreground/5 animate-pulse" />
    </>
  );
}
