"use client";

import { AlertPreferencesForm } from "@/components/settings/alert-preferences-form";

export default function AlertSettingsPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="font-headline text-2xl font-semibold text-foreground">
          Alert Preferences
        </h2>
        <p className="text-foreground/60 text-sm mt-1">
          Configure spending alerts and proactive farm notifications.
        </p>
      </div>

      <AlertPreferencesForm />
    </div>
  );
}
