import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";
import { instanceFiltersSchema } from "@/lib/validators/admin";
import { getAdminInstances } from "@/lib/queries/admin-lists";
import { InstanceTable } from "@/components/admin/instance-table";

interface InstancesPageProps {
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

export default async function InstancesPage({ searchParams }: InstancesPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/dashboard");
  }

  const parsed = instanceFiltersSchema.safeParse(
    normalizeSearchParams(await searchParams)
  );
  const filters = parsed.success ? parsed.data : instanceFiltersSchema.parse({});
  const result = await getAdminInstances(filters);

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
        Fleet
      </h2>
      <InstanceTable
        instances={result.instances}
        total={result.total}
        page={result.page}
        perPage={result.per_page}
        status={filters.status || ""}
        version={filters.version || ""}
      />
    </div>
  );
}
