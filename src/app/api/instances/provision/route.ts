import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoolifyClient } from "@/lib/coolify/client";
import { getHetznerClient } from "@/lib/hetzner/client";
import { buildCloudInitScript } from "@/lib/hetzner/cloud-init";
import {
  buildOpenClawConfig,
  encodeConfigForEnv,
} from "@/lib/templates/openclaw-config";
import { renderSoulTemplate } from "@/lib/templates/soul";
import { provisionRequestSchema } from "@/lib/validators/instance";
import { encrypt } from "@/lib/crypto";
import { randomBytes } from "node:crypto";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { sanitizeInstanceForClient } from "@/lib/security/sanitize";
import { DEFAULT_MEMORY_SETTINGS } from "@/types/memory";

const PROVISION_WINDOW_SECONDS = 300;
const PROVISION_MAX_ATTEMPTS = 3;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provisionAllowed = await consumeDurableRateLimit({
    action: "provision_user",
    key: user.id,
    windowSeconds: PROVISION_WINDOW_SECONDS,
    maxAttempts: PROVISION_MAX_ATTEMPTS,
  }).catch(() => null);

  if (provisionAllowed === null) {
    return NextResponse.json(
      { error: "Rate limiter unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  if (!provisionAllowed) {
    return NextResponse.json(
      { error: "Too many provisioning requests. Please try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = provisionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { customer_id, farm_profile, channel } = parsed.data;

  // Verify customer owns this record and has active subscription
  const adminSupabase = createAdminClient();
  const { data: customer } = await adminSupabase
    .from("customers")
    .select("id, user_id, subscription_status, plan")
    .eq("id", customer_id)
    .eq("user_id", user.id)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (customer.subscription_status !== "active") {
    return NextResponse.json(
      { error: "Active subscription required" },
      { status: 402 }
    );
  }

  const dockerImage =
    process.env.FARMCLAW_DOCKER_IMAGE || "farmclaw/openclaw:latest";
  const openclawVersion = dockerImage.split(":")[1] || "latest";

  try {
    // Save farm profile
    await adminSupabase.from("farm_profiles").upsert(
      {
        customer_id,
        farm_name: farm_profile.farm_name,
        state: farm_profile.state,
        county: farm_profile.county,
        primary_crops: farm_profile.primary_crops,
        acres: farm_profile.acres,
        elevator_urls: farm_profile.elevators,
        elevators: farm_profile.elevators.map((e) => e.name),
        weather_location: farm_profile.weather_location,
        weather_lat: farm_profile.weather_lat,
        weather_lng: farm_profile.weather_lng,
        timezone: farm_profile.timezone,
      },
      { onConflict: "customer_id" }
    );

    // Save skill configs
    const defaultSkillConfigs: { name: string; enabled: boolean; config?: Record<string, unknown> }[] = [
      { name: "farm-grain-bids", enabled: true },
      { name: "farm-weather", enabled: true },
      {
        name: "farm-scale-tickets",
        enabled: true,
        config: {
          visible_fields: ["date", "elevator", "crop", "net_weight", "moisture_pct", "price_per_bushel", "field_name"],
          required_fields: ["date", "crop", "net_weight"],
        },
      },
    ];
    for (const skill of defaultSkillConfigs) {
      await adminSupabase.from("skill_configs").upsert(
        {
          customer_id,
          skill_name: skill.name,
          enabled: skill.enabled,
          ...(skill.config ? { config: skill.config } : {}),
        },
        { onConflict: "customer_id,skill_name" }
      );
    }

    // Enforce one instance per customer.
    // If an instance already exists and is not in error state, return it.
    const { data: existingInstance } = await adminSupabase
      .from("instances")
      .select("id, customer_id, status, coolify_uuid, coolify_server_uuid, hetzner_server_id, openclaw_version, channel_type, channel_config")
      .eq("customer_id", customer_id)
      .maybeSingle();

    if (existingInstance && existingInstance.status !== "error") {
      return NextResponse.json({
        instance: sanitizeInstanceForClient(existingInstance),
        already_exists: true,
      });
    }

    // Build OpenClaw config
    const gatewayPassword = randomBytes(32).toString("base64url");
    const luksPassphrase = randomBytes(64).toString("base64url");
    const bootToken = randomBytes(32).toString("hex");
    const webhookSecret = randomBytes(32).toString("hex");
    const skillConfigs = [
      { skill_name: "farm-grain-bids", enabled: true },
      { skill_name: "farm-weather", enabled: true },
      { skill_name: "farm-scale-tickets", enabled: true },
    ];
    const openclawConfig = buildOpenClawConfig(
      {
        id: "",
        customer_id,
        farm_name: farm_profile.farm_name,
        state: farm_profile.state,
        county: farm_profile.county,
        primary_crops: farm_profile.primary_crops,
        acres: farm_profile.acres,
        elevators: farm_profile.elevators.map((e) => e.name),
        elevator_urls: farm_profile.elevators,
        weather_location: farm_profile.weather_location,
        weather_lat: farm_profile.weather_lat,
        weather_lng: farm_profile.weather_lng,
        timezone: farm_profile.timezone,
        created_at: "",
        updated_at: "",
      },
      { type: "discord", token: channel.token },
      process.env.OPENROUTER_API_KEY!,
      skillConfigs,
      gatewayPassword
    );

    // Build SOUL.md
    const soulMd = renderSoulTemplate({
      farm_name: farm_profile.farm_name,
      state: farm_profile.state,
      county: farm_profile.county,
      acres: farm_profile.acres,
      crops_list: farm_profile.primary_crops.join(", "),
      elevator_names: farm_profile.elevators.map((e) => e.name).join(", "),
      timezone: farm_profile.timezone,
    });

    // Ensure we have a provisioning instance record before external provisioning.
    let instanceId = existingInstance?.id ?? null;
    if (!instanceId) {
      const { data: inserted, error: insertError } = await adminSupabase
        .from("instances")
        .insert({
          customer_id,
          status: "provisioning",
          openclaw_version: openclawVersion,
          channel_type: "discord",
          channel_config: {
            token_encrypted: encrypt(channel.token),
            gateway_password_encrypted: encrypt(gatewayPassword),
          },
          webhook_secret_encrypted: encrypt(webhookSecret),
          luks_passphrase_encrypted: encrypt(luksPassphrase),
          boot_token: bootToken,
          boot_token_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .select("id, customer_id, status, coolify_uuid, openclaw_version")
        .single();

      if (insertError) {
        // Unique-constraint race: another request created the instance first.
        if (insertError.code === "23505") {
          const { data: racedInstance } = await adminSupabase
            .from("instances")
            .select("id, customer_id, status, coolify_uuid, openclaw_version")
            .eq("customer_id", customer_id)
            .single();
          if (racedInstance) {
            return NextResponse.json({
              instance: sanitizeInstanceForClient(racedInstance),
              already_exists: true,
            });
          }
        }
        throw new Error(insertError.message);
      }

      instanceId = inserted.id;
    } else {
      // Retry path for previously failed provisioning attempt.
      const { error: resetError } = await adminSupabase
        .from("instances")
        .update({
          status: "provisioning",
          coolify_uuid: null,
          openclaw_version: openclawVersion,
          channel_type: "discord",
          channel_config: {
            token_encrypted: encrypt(channel.token),
            gateway_password_encrypted: encrypt(gatewayPassword),
          },
          webhook_secret_encrypted: encrypt(webhookSecret),
          luks_passphrase_encrypted: encrypt(luksPassphrase),
          boot_token: bootToken,
          boot_token_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .eq("id", instanceId);

      if (resetError) {
        throw new Error(resetError.message);
      }
    }

    if (!instanceId) {
      throw new Error("Failed to initialize provisioning instance record");
    }

    const hetzner = getHetznerClient();
    const coolify = getCoolifyClient();
    let hetznerServerId: number | null = null;
    let coolifyServerUuid: string | null = null;
    let createdAppUuid: string | null = null;

    try {
      // ── Phase 1: Create Hetzner server ──
      const serverType = process.env.HETZNER_SERVER_TYPE || "cx22";
      const location = process.env.HETZNER_DEFAULT_LOCATION || "nbg1";
      const sshKeyId = parseInt(process.env.HETZNER_SSH_KEY_ID || "0", 10);

      const firewallId = parseInt(process.env.HETZNER_FIREWALL_ID || "0", 10);

      const { server: hetznerServer, action } = await hetzner.createServer({
        name: `farmclaw-${customer_id.slice(0, 8)}`,
        server_type: serverType,
        location,
        image: "ubuntu-24.04",
        ssh_keys: sshKeyId ? [sshKeyId] : [],
        user_data: buildCloudInitScript({
          bootToken,
          apiBaseUrl: process.env.NEXT_PUBLIC_APP_URL!,
        }),
        labels: {
          "managed-by": "farmclaw",
          "customer-id": customer_id,
        },
        ...(firewallId ? { firewalls: [{ firewall: firewallId }] } : {}),
      });

      hetznerServerId = hetznerServer.id;

      await adminSupabase
        .from("instances")
        .update({
          status: "provisioning_server",
          hetzner_server_id: hetznerServer.id,
          hetzner_action_id: action.id,
          hetzner_location: location,
          server_ip: hetznerServer.public_net.ipv4.ip,
        })
        .eq("id", instanceId);

      // ── Phase 2: Poll until server is ready ──
      const maxPolls = 90;
      const pollInterval = 5000;
      for (let i = 0; i < maxPolls; i++) {
        const actionStatus = await hetzner.getAction(action.id);
        if (actionStatus.status === "success") break;
        if (actionStatus.status === "error") {
          throw new Error(
            `Hetzner server creation failed: ${actionStatus.error?.message || "unknown error"}`
          );
        }
        await new Promise((r) => setTimeout(r, pollInterval));
      }

      // Refresh server to confirm final IP
      const readyServer = await hetzner.getServer(hetznerServer.id);
      const serverIp = readyServer.public_net.ipv4.ip;

      await adminSupabase
        .from("instances")
        .update({
          server_ip: serverIp,
          hetzner_action_id: null,
        })
        .eq("id", instanceId);

      // ── Phase 3: Add to Coolify + deploy container ──
      await adminSupabase
        .from("instances")
        .update({ status: "provisioning_coolify" })
        .eq("id", instanceId);

      const coolifyServer = await coolify.addServer({
        name: `farmclaw-${customer_id.slice(0, 8)}`,
        ip: serverIp,
        user: "root",
        port: 22,
        private_key_uuid: process.env.COOLIFY_SSH_KEY_UUID!,
        instant_validate: true,
      });
      coolifyServerUuid = coolifyServer.uuid;

      await adminSupabase
        .from("instances")
        .update({ coolify_server_uuid: coolifyServer.uuid })
        .eq("id", instanceId);

      // Retry validation until Docker is installed via cloud-init
      const maxValidationRetries = 36;
      for (let i = 0; i < maxValidationRetries; i++) {
        const validation = await coolify.validateServer(coolifyServer.uuid);
        if (validation.is_usable) break;
        if (i === maxValidationRetries - 1) {
          throw new Error("Coolify server validation timed out — Docker may not be installed");
        }
        await new Promise((r) => setTimeout(r, 5000));
      }

      const vaultStorageRoot = process.env.FARMCLAW_VAULT_STORAGE_ROOT;
      const persistentStorages = vaultStorageRoot
        ? [
            {
              hostPath: `${vaultStorageRoot.replace(/\/$/, "")}/${customer_id}`,
              mountPath: "/home/node/.openclaw/vault",
            },
          ]
        : undefined;

      const app = await coolify.createApplication({
        name: `farmclaw-${customer_id.slice(0, 8)}`,
        image: dockerImage,
        envVars: {
          OPENCLAW_CONFIG: encodeConfigForEnv(openclawConfig),
          SOUL_MD: Buffer.from(soulMd).toString("base64"),
          // TODO: Shared API key risk — all customer instances use the same OpenRouter key.
          // Future fix: provision per-customer API keys or route through a proxy gateway
          // that tracks usage per customer_id and enforces per-customer rate limits.
          OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
          FARMCLAW_MEMORY_MODE: DEFAULT_MEMORY_SETTINGS.mode,
          FARMCLAW_MEMORY_CAPTURE_LEVEL: DEFAULT_MEMORY_SETTINGS.capture_level,
          FARMCLAW_MEMORY_RETENTION_DAYS: String(
            DEFAULT_MEMORY_SETTINGS.retention_days
          ),
          FARMCLAW_MEMORY_EXCLUDE_CATEGORIES: JSON.stringify(
            DEFAULT_MEMORY_SETTINGS.exclude_categories
          ),
          FARMCLAW_MEMORY_AUTO_CHECKPOINT: String(
            DEFAULT_MEMORY_SETTINGS.auto_checkpoint
          ),
          FARMCLAW_MEMORY_AUTO_COMPRESS: String(
            DEFAULT_MEMORY_SETTINGS.auto_compress
          ),
          FARMCLAW_VAULT_PATH: "/home/node/.openclaw/vault",
          FARMCLAW_WEBHOOK_URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/openclaw`,
          FARMCLAW_WEBHOOK_SECRET: webhookSecret,
          FARMCLAW_INSTANCE_ID: instanceId!,
        },
        serverUuid: coolifyServer.uuid,
        projectUuid: process.env.COOLIFY_PROJECT_UUID!,
        environmentName: process.env.COOLIFY_ENVIRONMENT_NAME || "production",
        ...(persistentStorages ? { persistentStorages } : {}),
      });
      createdAppUuid = app.uuid;

      await coolify.startApplication(app.uuid);

      const { data: instance, error: updateError } = await adminSupabase
        .from("instances")
        .update({
          coolify_uuid: app.uuid,
          status: "running",
        })
        .eq("id", instanceId)
        .select()
        .single();

      if (updateError || !instance) {
        throw new Error(updateError?.message || "Failed to finalize instance");
      }

      auditLog({
        action: "instance.provision",
        actor: user.id,
        resource_type: "instance",
        resource_id: instance.id,
        details: { customer_id, farm_name: farm_profile.farm_name },
      });

      return NextResponse.json({ instance: sanitizeInstanceForClient(instance) });
    } catch (provisionError) {
      // Reverse-order cleanup: app → Coolify server → Hetzner VPS
      if (createdAppUuid) {
        try {
          await coolify.deleteApplication(createdAppUuid);
        } catch {
          // Best effort
        }
      }
      if (coolifyServerUuid) {
        try {
          await coolify.deleteServer(coolifyServerUuid);
        } catch {
          // Best effort
        }
      }
      if (hetznerServerId) {
        try {
          await hetzner.deleteServer(hetznerServerId);
        } catch {
          // Best effort
        }
      }

      await adminSupabase
        .from("instances")
        .update({
          status: "error",
          coolify_uuid: null,
          coolify_server_uuid: null,
          hetzner_action_id: null,
        })
        .eq("id", instanceId);

      throw provisionError;
    }
  } catch (err) {
    return NextResponse.json(
      { error: safeErrorMessage(err, "Provisioning failed") },
      { status: 500 }
    );
  }
}
