import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { auditLog } from "@/lib/security/audit";
import { evaluateAndEnforceExtensionRolloutGates } from "@/lib/queries/extensibility-rollouts";

export async function POST(
  _request: Request,
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

  try {
    const admin = createAdminClient();
    const result = await evaluateAndEnforceExtensionRolloutGates(
      admin,
      id,
      user.email || user.id
    );

    if (!result.evaluation) {
      return NextResponse.json({ error: "Rollout not found" }, { status: 404 });
    }

    auditLog({
      action: "extension.rollout.gates.evaluate",
      actor: user.email || user.id,
      resource_type: "extension_rollout",
      resource_id: id,
      details: {
        gate_breached: result.evaluation.gate_breached,
        breached_rules: result.evaluation.breached_rules,
        halted: result.halted,
        auto_rollback_queued: result.autoRollbackQueued,
      },
    });

    return NextResponse.json({
      evaluation: result.evaluation,
      halted: result.halted,
      auto_rollback_queued: result.autoRollbackQueued,
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to evaluate rollout health gates") },
      { status: 500 }
    );
  }
}
