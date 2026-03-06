import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin-session";
import { ModelCatalogTable } from "@/components/admin/model-catalog-table";

export const metadata: Metadata = { title: "Model Catalog" };

export default async function AdminModelsPage() {
  await requireAdmin();

  return (
    <div>
      <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
        Model Catalog
      </h2>
      <ModelCatalogTable />
    </div>
  );
}
