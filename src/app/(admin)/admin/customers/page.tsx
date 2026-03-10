import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin-session";
import { customerFiltersSchema } from "@/lib/validators/admin";
import { getAdminCustomers } from "@/lib/queries/admin-lists";
import { CustomerTable } from "@/components/admin/customer-table";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Customers" };

interface CustomersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function normalizeSearchParams(
  params: Record<string, string | string[] | undefined>
) {
  return Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requireAdmin();

  const parsed = customerFiltersSchema.safeParse(
    normalizeSearchParams(await searchParams)
  );
  const filters = parsed.success ? parsed.data : customerFiltersSchema.parse({});

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
        Customers
      </h2>
      <Suspense fallback={<CustomersSkeleton />}>
        <CustomersContent filters={filters} />
      </Suspense>
    </div>
  );
}

async function CustomersContent({
  filters,
}: {
  filters: ReturnType<typeof customerFiltersSchema.parse>;
}) {
  const result = await getAdminCustomers(filters);

  return (
    <CustomerTable
      customers={result.customers}
      total={result.total}
      page={result.page}
      perPage={result.per_page}
      search={filters.search || ""}
      status={filters.status || ""}
      state={filters.state || ""}
    />
  );
}

function CustomersSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
    </div>
  );
}
