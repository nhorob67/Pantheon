import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-session";
import { AdminOverviewData } from "./_components/admin-overview-data";

export const metadata: Metadata = { title: "Admin Overview" };

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border shadow-sm p-6 animate-pulse h-28"
        />
      ))}
    </div>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-2xl font-bold text-foreground">
        Overview
      </h2>

      <Suspense fallback={<OverviewSkeleton />}>
        <AdminOverviewData />
      </Suspense>
    </div>
  );
}
