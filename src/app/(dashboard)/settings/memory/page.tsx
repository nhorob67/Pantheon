import { createClient } from "@/lib/supabase/server";
import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";
import { MemorySettingsPanel } from "@/components/settings/memory-settings-panel";
import { buildDefaultMemorySettings } from "@/types/memory";

export default async function MemorySettingsPage() {
  const { customerId } = await requireDashboardCustomer();

  const instance = await getCustomerInstance(customerId);

  if (!instance) {
    return (
      <div>
        <div className="mb-6">
          <h3 className="font-headline text-lg font-semibold mb-1">Memory</h3>
          <p className="text-foreground/60 text-sm">
            Provision your instance first to configure memory mode and vault behavior.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("instance_memory_settings")
    .select(
      "instance_id, customer_id, mode, capture_level, retention_days, exclude_categories, auto_checkpoint, auto_compress, updated_by, created_at, updated_at"
    )
    .eq("instance_id", instance.id)
    .maybeSingle();

  const initialSettings =
    settings || buildDefaultMemorySettings(instance.id, customerId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold mb-1">Memory</h3>
        <p className="text-foreground/60 text-sm">
          Control how FarmClaw stores and compresses long-lived context.
        </p>
      </div>

      <MemorySettingsPanel
        instanceId={instance.id}
        initialSettings={initialSettings}
      />
    </div>
  );
}
