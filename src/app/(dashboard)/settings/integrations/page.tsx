import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsSettingsPage() {
  redirect("/settings/mcp-servers");
}
