import type { Metadata } from "next";
import { ExtensionMarketplacePanel } from "@/components/settings/extension-marketplace-panel";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";

export const metadata: Metadata = { title: "Extensions" };

export default async function ExtensionsSettingsPage() {
  await requireDashboardCustomer();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">Extensions</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Browse, install, and manage platform extensions
        </p>
      </div>

      <ExtensionMarketplacePanel />
    </div>
  );
}
