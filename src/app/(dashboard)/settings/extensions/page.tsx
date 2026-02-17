import { ExtensionMarketplacePanel } from "@/components/settings/extension-marketplace-panel";
import { requireDashboardCustomer } from "@/lib/auth/dashboard-session";

export default async function ExtensionsSettingsPage() {
  await requireDashboardCustomer();

  return <ExtensionMarketplacePanel />;
}
