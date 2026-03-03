import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin-session";
import { customerFiltersSchema } from "@/lib/validators/admin";
import { getAdminCustomers } from "@/lib/queries/admin-lists";

export const metadata: Metadata = { title: "Customers" };
import { CustomerTable } from "@/components/admin/customer-table";

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
  const result = await getAdminCustomers(filters);

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
        Customers
      </h2>
      <CustomerTable
        customers={result.customers}
        total={result.total}
        page={result.page}
        perPage={result.per_page}
        search={filters.search || ""}
        status={filters.status || ""}
        state={filters.state || ""}
      />
    </div>
  );
}
