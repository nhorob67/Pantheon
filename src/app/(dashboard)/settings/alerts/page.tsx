import type { Metadata } from "next";
import { AlertPreferencesForm } from "@/components/settings/alert-preferences-form";

export const metadata: Metadata = { title: "Alert Preferences | Pantheon" };

export default function AlertSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-headline text-2xl font-semibold">
          Alert Preferences
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Configure spending alerts and proactive notifications.
        </p>
      </div>

      <AlertPreferencesForm />
    </div>
  );
}
