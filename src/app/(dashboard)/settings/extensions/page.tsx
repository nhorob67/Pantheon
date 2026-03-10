import type { Metadata } from "next";
import { ExtensionMarketplacePanel } from "@/components/settings/extension-marketplace-panel";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";

export const metadata: Metadata = { title: "Extensions" };

export default async function ExtensionsSettingsPage() {
  await requireDashboardCustomer();

  return <ExtensionMarketplacePanel />;
}
