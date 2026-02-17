import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  createExtensionUpdateRollout,
  RolloutInputError,
} from "@/lib/queries/extensibility-rollouts";
import { extensionRolloutCreateSchema } from "@/lib/validators/extensibility";

interface RolloutRow {
  id: string;
  status: string;
  created_at: string;
}

interface RolloutTargetRow {
  rollout_id: string;
  ring: "canary" | "standard" | "delayed";
  status: string;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const { data: rollouts, error } = await admin
      .from("extension_update_rollouts")
      .select(
        "*, extension_catalog_items(id, slug, display_name), extension_catalog_versions(id, version, published_at)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { error: safeErrorMessage(error, "Failed to load extension rollouts") },
        { status: 500 }
      );
    }

    const rolloutRows = (rollouts || []) as RolloutRow[];
    if (rolloutRows.length === 0) {
      return NextResponse.json({ rollouts: [] });
    }

    const rolloutIds = rolloutRows.map((rollout) => rollout.id);
    const { data: targets, error: targetsError } = await admin
      .from("extension_update_rollout_targets")
      .select("rollout_id, ring, status")
      .in("rollout_id", rolloutIds);

    if (targetsError) {
      return NextResponse.json(
        { error: safeErrorMessage(targetsError, "Failed to load rollout targets") },
        { status: 500 }
      );
    }

    const summaryByRollout = new Map<
      string,
      {
        total: number;
        status_counts: Record<string, number>;
        ring_counts: Record<string, number>;
      }
    >();

    for (const target of (targets || []) as RolloutTargetRow[]) {
      const summary = summaryByRollout.get(target.rollout_id) || {
        total: 0,
        status_counts: {},
        ring_counts: {},
      };

      summary.total += 1;
      summary.status_counts[target.status] =
        (summary.status_counts[target.status] || 0) + 1;
      summary.ring_counts[target.ring] = (summary.ring_counts[target.ring] || 0) + 1;
      summaryByRollout.set(target.rollout_id, summary);
    }

    return NextResponse.json({
      rollouts: rolloutRows.map((rollout) => ({
        ...rollout,
        target_summary: summaryByRollout.get(rollout.id) || {
          total: 0,
          status_counts: {},
          ring_counts: {},
        },
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load extension rollouts") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = extensionRolloutCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const created = await createExtensionUpdateRollout(admin, {
      customerId: parsed.data.customer_id || null,
      itemId: parsed.data.item_id,
      targetVersionId: parsed.data.target_version_id,
      initiatedBy: user.email || "unknown",
      batchSizes: parsed.data.batch_sizes,
      gatePolicy: parsed.data.gate_policy,
      notes: parsed.data.notes,
    });

    auditLog({
      action: "extension.rollout.create",
      actor: user.email || user.id,
      resource_type: "extension_rollout",
      resource_id: created.rollout.id,
      details: {
        customer_id: created.rollout.customer_id,
        item_id: created.rollout.item_id,
        target_version_id: created.rollout.target_version_id,
        target_version: created.targetVersion.version,
        total_targets: created.totalTargets,
        ring_counts: created.ringCounts,
      },
    });

    return NextResponse.json(
      {
        rollout: created.rollout,
        target_version: created.targetVersion,
        target_summary: {
          total: created.totalTargets,
          ring_counts: created.ringCounts,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof RolloutInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to create extension rollout") },
      { status: 500 }
    );
  }
}
