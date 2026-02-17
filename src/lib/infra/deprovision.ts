import { createAdminClient } from "@/lib/supabase/admin";
import { getCoolifyClient } from "@/lib/coolify/client";
import { getHetznerClient } from "@/lib/hetzner/client";

export interface DeprovisionResult {
  success: boolean;
  steps: {
    coolify_app: "ok" | "skipped" | "error";
    coolify_server: "ok" | "skipped" | "error";
    hetzner_server: "ok" | "skipped" | "error";
  };
  errors: string[];
}

export async function deprovisionInstance(
  instanceId: string
): Promise<DeprovisionResult> {
  const supabase = createAdminClient();
  const result: DeprovisionResult = {
    success: true,
    steps: {
      coolify_app: "skipped",
      coolify_server: "skipped",
      hetzner_server: "skipped",
    },
    errors: [],
  };

  const { data: instance } = await supabase
    .from("instances")
    .select("id, customer_id, coolify_uuid, coolify_server_uuid, hetzner_server_id, status")
    .eq("id", instanceId)
    .single();

  if (!instance) {
    return { success: false, steps: result.steps, errors: ["Instance not found"] };
  }

  await supabase
    .from("instances")
    .update({ status: "deprovisioning" })
    .eq("id", instanceId);

  const coolify = getCoolifyClient();
  const hetzner = getHetznerClient();

  // 1. Delete Coolify application
  if (instance.coolify_uuid) {
    try {
      await coolify.deleteApplication(instance.coolify_uuid);
      result.steps.coolify_app = "ok";
    } catch (err) {
      result.steps.coolify_app = "error";
      result.errors.push(
        `Coolify app delete: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // 2. Remove Coolify server
  if (instance.coolify_server_uuid) {
    try {
      await coolify.deleteServer(instance.coolify_server_uuid);
      result.steps.coolify_server = "ok";
    } catch (err) {
      result.steps.coolify_server = "error";
      result.errors.push(
        `Coolify server delete: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // 3. Destroy Hetzner VPS
  if (instance.hetzner_server_id) {
    try {
      await hetzner.deleteServer(instance.hetzner_server_id);
      result.steps.hetzner_server = "ok";
    } catch (err) {
      result.steps.hetzner_server = "error";
      result.errors.push(
        `Hetzner server delete: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  result.success = result.errors.length === 0;
  const finalStatus = result.success ? "deprovisioned" : "deprovision_error";

  // Keep hetzner_server_id and server_ip for audit trail
  await supabase
    .from("instances")
    .update({
      status: finalStatus,
      coolify_uuid: null,
      coolify_server_uuid: null,
      hetzner_action_id: null,
    })
    .eq("id", instanceId);

  return result;
}
