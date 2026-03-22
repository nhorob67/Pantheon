import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import { safeErrorMessage } from "@/lib/security/safe-error";
import { resolveDiscordUserRole } from "@/lib/runtime/tenant-discord-role-resolver";
import { executeTenantApprovalDecision } from "@/lib/runtime/tenant-approval-executor";
import { updateDiscordApprovalMessage } from "@/lib/runtime/tenant-approval-discord-notifier";
import { resolveDiscordBotToken } from "@/lib/runtime/tenant-runtime-discord-lifecycle";

const requestSchema = z.object({
  tenant_id: z.uuid(),
  approval_id: z.uuid(),
  discord_user_id: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
});

function isAuthorized(request: Request): boolean {
  const expectedTokens = [
    process.env.PANTHEON_BOT_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);

  if (expectedTokens.length === 0) return false;

  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;

  if (!bearerToken) return false;

  return constantTimeTokenInSet(bearerToken, expectedTokens);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tenant_id, approval_id, discord_user_id, decision } = parsed.data;
  const requestTraceId = request.headers.get("x-request-id") || crypto.randomUUID();

  try {
    const admin = createAdminClient();

    // Resolve Discord user → Pantheon identity
    const roleResolution = await resolveDiscordUserRole(admin, tenant_id, discord_user_id);

    if (!roleResolution.linked || !roleResolution.userId) {
      return NextResponse.json(
        { error: "Link your Discord account in Pantheon settings to use approval buttons." },
        { status: 403 }
      );
    }

    // Execute the decision
    const result = await executeTenantApprovalDecision(admin, {
      tenantId: tenant_id,
      approvalId: approval_id,
      decidedByUserId: roleResolution.userId,
      decidedByRole: roleResolution.role,
      decision,
      requestTraceId,
    });

    if (!result.ok) {
      // For already-decided approvals, also try to update the Discord message
      if (result.httpStatus === 409) {
        const botToken = await resolveDiscordBotToken(admin, tenant_id);
        if (botToken) {
          const { data: approvalRow } = await admin
            .from("tenant_approvals")
            .select("discord_message_id, discord_channel_id, status")
            .eq("id", approval_id)
            .maybeSingle();

          if (approvalRow?.discord_message_id && approvalRow?.discord_channel_id) {
            updateDiscordApprovalMessage({
              botToken,
              channelId: approvalRow.discord_channel_id,
              messageId: approvalRow.discord_message_id,
              decision: approvalRow.status === "approved" ? "approved" : "rejected",
              decidedBy: discord_user_id,
            }).catch(() => {});
          }
        }
      }

      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to process approval decision") },
      { status: 500 }
    );
  }
}
