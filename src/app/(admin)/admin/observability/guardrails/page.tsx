import { Suspense } from "react";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin-session";
import { getGuardrailSnapshot, getGuardrailAnalytics } from "@/lib/queries/admin-guardrails";
import { GuardrailEventsPanel } from "@/components/admin/guardrail-events-panel";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export const metadata: Metadata = { title: "Guardrail Events" };

export default async function AdminGuardrailsPage() {
  await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/admin/observability"
              className="text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              &larr; Observability
            </Link>
          </div>
          <h2 className="font-headline text-2xl font-bold text-foreground">
            Guardrail Events
          </h2>
          <p className="text-sm text-foreground/60 mt-1">
            Loop detections, budget limits, and safety halts across all tenants
          </p>
        </div>
      </div>

      <Suspense fallback={<GuardrailsSkeleton />}>
        <GuardrailsContent />
      </Suspense>
    </div>
  );
}

async function GuardrailsContent() {
  const admin = createAdminClient();
  const [snapshot, analytics] = await Promise.all([
    getGuardrailSnapshot(admin),
    getGuardrailAnalytics(admin, 7),
  ]);
  return <GuardrailEventsPanel snapshot={snapshot} analytics={analytics} />;
}

function GuardrailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
