import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  extensionInstallRequestSchema,
  type ExtensionInstallRequest,
} from "@/lib/validators/extensibility";
import {
  evaluateExtensionTrust,
  loadCustomerExtensionTrustPolicy,
} from "@/lib/extensions/trust-policy";
import type {
  ExtensionCatalogItem,
  ExtensionCatalogVersion,
  ExtensionInstallation,
} from "@/types/extensibility";

const EXTENSION_CATALOG_ITEM_SELECT_COLUMNS =
  "id, slug, kind, display_name, description, source_type, source_ref, homepage_url, docs_url, verified, active, metadata, created_at, updated_at";
const EXTENSION_INSTALLATION_SELECT_COLUMNS =
  "id, customer_id, instance_id, item_id, version_id, pinned_version, install_status, health_status, config, installed_at, last_error, created_at, updated_at";
const EXTENSION_INSTALLATION_LIST_SELECT_COLUMNS = `${EXTENSION_INSTALLATION_SELECT_COLUMNS}, extension_catalog_items(id, slug, kind, display_name, source_type, verified), extension_catalog_versions(id, version, published_at)`;

interface CustomerContext {
  id: string;
}

interface ExtensionInstallationWithRelations extends ExtensionInstallation {
  extension_catalog_items:
    | Pick<
        ExtensionCatalogItem,
        "id" | "slug" | "kind" | "display_name" | "source_type" | "verified"
      >
    | Pick<
        ExtensionCatalogItem,
        "id" | "slug" | "kind" | "display_name" | "source_type" | "verified"
      >[]
    | null;
  extension_catalog_versions:
    | Pick<ExtensionCatalogVersion, "id" | "version" | "published_at">
    | Pick<ExtensionCatalogVersion, "id" | "version" | "published_at">[]
    | null;
}

function collapseJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

async function loadCustomerContext(userId: string): Promise<CustomerContext | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

async function ensureCustomerInstanceOwnership(
  customerId: string,
  instanceId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("instances")
    .select("id")
    .eq("id", instanceId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return !!data;
}

async function resolveDefaultInstanceId(customerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("instances")
    .select("id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id || null;
}

async function resolveCatalogItem(
  input: Pick<ExtensionInstallRequest, "item_id" | "slug">
): Promise<ExtensionCatalogItem | null> {
  const admin = createAdminClient();
  let query = admin
    .from("extension_catalog_items")
    .select(EXTENSION_CATALOG_ITEM_SELECT_COLUMNS)
    .eq("active", true);

  if (input.item_id) {
    query = query.eq("id", input.item_id);
  } else if (input.slug) {
    query = query.eq("slug", input.slug);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data || null) as ExtensionCatalogItem | null;
}

async function resolveTargetCatalogVersion(
  itemId: string,
  versionId?: string
): Promise<Pick<ExtensionCatalogVersion, "id" | "version" | "published_at"> | null> {
  const admin = createAdminClient();
  let query = admin
    .from("extension_catalog_versions")
    .select("id, version, published_at")
    .eq("item_id", itemId);

  if (versionId) {
    query = query.eq("id", versionId);
  } else {
    query = query.order("published_at", { ascending: false }).limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return (data || null) as Pick<
    ExtensionCatalogVersion,
    "id" | "version" | "published_at"
  > | null;
}

async function findExistingInstallation(
  customerId: string,
  itemId: string,
  instanceId: string | null
): Promise<ExtensionInstallation | null> {
  const admin = createAdminClient();
  let query = admin
    .from("extension_installations")
    .select(EXTENSION_INSTALLATION_SELECT_COLUMNS)
    .eq("customer_id", customerId)
    .eq("item_id", itemId);

  if (instanceId) {
    query = query.eq("instance_id", instanceId);
  } else {
    query = query.is("instance_id", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return (data || null) as ExtensionInstallation | null;
}

async function upsertInstallationAndQueueOperation(params: {
  customerId: string;
  instanceId: string | null;
  item: ExtensionCatalogItem;
  version: Pick<ExtensionCatalogVersion, "id" | "version" | "published_at">;
  requestedBy: string;
  pinVersion: boolean;
}): Promise<{
  installation: ExtensionInstallation;
  operationId: string;
  operationType: "install" | "upgrade";
}> {
  const admin = createAdminClient();
  const existing = await findExistingInstallation(
    params.customerId,
    params.item.id,
    params.instanceId
  );

  const operationType: "install" | "upgrade" =
    !existing || existing.install_status === "removed" ? "install" : "upgrade";

  let installation: ExtensionInstallation;
  if (!existing) {
    const { data, error } = await admin
      .from("extension_installations")
      .insert({
        customer_id: params.customerId,
        instance_id: params.instanceId,
        item_id: params.item.id,
        version_id: params.version.id,
        pinned_version: params.pinVersion ? params.version.version : null,
        install_status: "pending",
        health_status: "unknown",
      })
      .select(EXTENSION_INSTALLATION_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      throw new Error(safeErrorMessage(error, "Failed to create installation"));
    }
    installation = data as ExtensionInstallation;
  } else {
    const { data, error } = await admin
      .from("extension_installations")
      .update({
        version_id: params.version.id,
        pinned_version: params.pinVersion
          ? params.version.version
          : existing.pinned_version,
        install_status: "pending",
        health_status: "unknown",
        last_error: null,
      })
      .eq("id", existing.id)
      .select(EXTENSION_INSTALLATION_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      throw new Error(safeErrorMessage(error, "Failed to update installation"));
    }
    installation = data as ExtensionInstallation;
  }

  const { data: operation, error: operationError } = await admin
    .from("extension_operations")
    .insert({
      operation_type: operationType,
      scope_type: params.instanceId ? "instance" : "customer",
      status: "pending",
      customer_id: params.customerId,
      instance_id: params.instanceId,
      requested_by: params.requestedBy,
      metadata: {
        source: "api.extensions.installations.post",
        item_id: params.item.id,
        item_slug: params.item.slug,
        target_version_id: params.version.id,
        target_version: params.version.version,
      },
    })
    .select("id")
    .single();

  if (operationError || !operation) {
    throw new Error(
      safeErrorMessage(operationError, "Failed to create installation operation")
    );
  }

  const { error: targetError } = await admin
    .from("extension_operation_targets")
    .insert({
      operation_id: operation.id,
      installation_id: installation.id,
      target_version_id: params.version.id,
      status: "pending",
    });

  if (targetError) {
    throw new Error(
      safeErrorMessage(targetError, "Failed to create installation operation target")
    );
  }

  return {
    installation,
    operationId: operation.id,
    operationType,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customer = await loadCustomerContext(user.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("extension_installations")
      .select(EXTENSION_INSTALLATION_LIST_SELECT_COLUMNS)
      .eq("customer_id", customer.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: safeErrorMessage(error, "Failed to load installations") },
        { status: 500 }
      );
    }

    const installations = ((data || []) as ExtensionInstallationWithRelations[]).map(
      (row) => ({
        ...row,
        extension_catalog_items: collapseJoin(row.extension_catalog_items),
        extension_catalog_versions: collapseJoin(row.extension_catalog_versions),
      })
    );

    return NextResponse.json({ installations });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load installations") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = extensionInstallRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const customer = await loadCustomerContext(user.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    const admin = createAdminClient();

    const requestedInstanceId =
      parsed.data.instance_id || (await resolveDefaultInstanceId(customer.id));
    if (parsed.data.instance_id) {
      const ownsInstance = await ensureCustomerInstanceOwnership(
        customer.id,
        parsed.data.instance_id
      );
      if (!ownsInstance) {
        return NextResponse.json({ error: "Instance not found" }, { status: 404 });
      }
    }

    const item = await resolveCatalogItem(parsed.data);
    if (!item) {
      return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });
    }

    const trustPolicy = await loadCustomerExtensionTrustPolicy(admin, customer.id);
    const trustDecision = evaluateExtensionTrust(item, trustPolicy);
    if (!trustDecision.allowed) {
      return NextResponse.json(
        { error: trustDecision.reason || "Extension is blocked by trust policy" },
        { status: 403 }
      );
    }

    const version = await resolveTargetCatalogVersion(item.id, parsed.data.version_id);
    if (!version) {
      return NextResponse.json(
        { error: "No catalog version available for this extension" },
        { status: 400 }
      );
    }

    const queued = await upsertInstallationAndQueueOperation({
      customerId: customer.id,
      instanceId: requestedInstanceId,
      item,
      version,
      requestedBy: user.email || "unknown",
      pinVersion: parsed.data.pin_version,
    });

    auditLog({
      action:
        queued.operationType === "install"
          ? "extension.install.queued"
          : "extension.upgrade.queued",
      actor: user.email || user.id,
      resource_type: "extension_installation",
      resource_id: queued.installation.id,
      details: {
        customer_id: customer.id,
        instance_id: requestedInstanceId,
        operation_id: queued.operationId,
        item_id: item.id,
        item_slug: item.slug,
        source_type: item.source_type,
        target_version_id: version.id,
        target_version: version.version,
        pin_version: parsed.data.pin_version,
      },
    });

    return NextResponse.json(
      {
        installation: queued.installation,
        operation: {
          id: queued.operationId,
          type: queued.operationType,
          status: "pending",
        },
        target_version: version,
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to queue extension installation") },
      { status: 500 }
    );
  }
}
