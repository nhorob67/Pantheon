import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { extensionRollbackRequestSchema } from "@/lib/validators/extensibility";

interface OwnedInstallation {
  id: string;
  customer_id: string;
  instance_id: string | null;
  item_id: string;
  version_id: string | null;
}

interface CatalogVersionRow {
  id: string;
  version: string;
  published_at: string;
}

async function loadCustomerIdForUser(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id || null;
}

async function loadOwnedInstallation(
  installationId: string,
  customerId: string
): Promise<OwnedInstallation | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("extension_installations")
    .select("id, customer_id, instance_id, item_id, version_id")
    .eq("id", installationId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data || null) as OwnedInstallation | null;
}

async function resolveRollbackTargetVersion(
  installation: OwnedInstallation,
  targetVersionId?: string
): Promise<CatalogVersionRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("extension_catalog_versions")
    .select("id, version, published_at")
    .eq("item_id", installation.item_id)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const versions = (data || []) as CatalogVersionRow[];
  if (versions.length === 0) {
    return null;
  }

  if (targetVersionId) {
    return versions.find((version) => version.id === targetVersionId) || null;
  }

  if (!installation.version_id) {
    return versions[0] || null;
  }

  const currentIndex = versions.findIndex(
    (version) => version.id === installation.version_id
  );
  if (currentIndex === -1) {
    return versions[0] || null;
  }

  return versions[currentIndex + 1] || null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = extensionRollbackRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const customerId = await loadCustomerIdForUser(user.id);
    if (!customerId) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const installation = await loadOwnedInstallation(id, customerId);
    if (!installation) {
      return NextResponse.json({ error: "Installation not found" }, { status: 404 });
    }

    const targetVersion = await resolveRollbackTargetVersion(
      installation,
      parsed.data.target_version_id
    );

    if (!targetVersion) {
      return NextResponse.json(
        { error: "No rollback target version available" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: operation, error: operationError } = await admin
      .from("extension_operations")
      .insert({
        operation_type: "rollback",
        scope_type: installation.instance_id ? "instance" : "customer",
        status: "pending",
        customer_id: customerId,
        instance_id: installation.instance_id,
        requested_by: user.email || "unknown",
        metadata: {
          source: "api.extensions.installations.rollback",
          installation_id: installation.id,
          item_id: installation.item_id,
          from_version_id: installation.version_id,
          target_version_id: targetVersion.id,
          target_version: targetVersion.version,
        },
      })
      .select("id")
      .single();

    if (operationError || !operation) {
      return NextResponse.json(
        {
          error: safeErrorMessage(
            operationError,
            "Failed to create rollback operation"
          ),
        },
        { status: 500 }
      );
    }

    const { error: targetError } = await admin
      .from("extension_operation_targets")
      .insert({
        operation_id: operation.id,
        installation_id: installation.id,
        target_version_id: targetVersion.id,
        status: "pending",
      });

    if (targetError) {
      return NextResponse.json(
        {
          error: safeErrorMessage(
            targetError,
            "Failed to create rollback operation target"
          ),
        },
        { status: 500 }
      );
    }

    const { error: installationUpdateError } = await admin
      .from("extension_installations")
      .update({
        install_status: "rollback_pending",
        last_error: null,
      })
      .eq("id", installation.id);

    if (installationUpdateError) {
      return NextResponse.json(
        {
          error: safeErrorMessage(
            installationUpdateError,
            "Failed to update installation rollback status"
          ),
        },
        { status: 500 }
      );
    }

    auditLog({
      action: "extension.rollback.queued",
      actor: user.email || user.id,
      resource_type: "extension_installation",
      resource_id: installation.id,
      details: {
        customer_id: customerId,
        instance_id: installation.instance_id,
        operation_id: operation.id,
        item_id: installation.item_id,
        from_version_id: installation.version_id,
        target_version_id: targetVersion.id,
        target_version: targetVersion.version,
      },
    });

    return NextResponse.json(
      {
        installation_id: installation.id,
        operation: {
          id: operation.id,
          type: "rollback",
          status: "pending",
        },
        target_version: targetVersion,
      },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to queue rollback operation") },
      { status: 500 }
    );
  }
}
