import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import {
  RolloutInputError,
  transitionExtensionRolloutStatus,
} from "@/lib/queries/extensibility-rollouts";
import { extensionRolloutControlSchema } from "@/lib/validators/extensibility";

async function parseControlRequest(request: Request) {
  try {
    const body = await request.json();
    const parsed = extensionRolloutControlSchema.safeParse(body);
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
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

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const control = await parseControlRequest(request);

  try {
    const admin = createAdminClient();
    const rollout = await transitionExtensionRolloutStatus(admin, {
      rolloutId: id,
      allowedCurrentStatuses: ["pending", "in_progress"],
      nextStatus: "paused",
      actor: user.email || user.id,
      reason: control.reason,
    });

    if (!rollout) {
      return NextResponse.json({ error: "Rollout not found" }, { status: 404 });
    }

    auditLog({
      action: "extension.rollout.pause",
      actor: user.email || user.id,
      resource_type: "extension_rollout",
      resource_id: rollout.id,
      details: {
        status: rollout.status,
        reason: control.reason || null,
      },
    });

    return NextResponse.json({ rollout });
  } catch (error) {
    if (error instanceof RolloutInputError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to pause extension rollout") },
      { status: 500 }
    );
  }
}
