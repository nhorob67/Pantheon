import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantRole } from "@/types/tenant-runtime";

export interface DiscordRoleResolution {
  role: TenantRole;
  userId: string | null;
  linked: boolean;
  autoLinked: boolean;
}

/**
 * Resolves a Discord user's role within a tenant.
 *
 * 1. Look up existing link in tenant_discord_links
 * 2. If found, join tenant_members to get role
 * 3. If NOT found AND tenant has zero discord links, auto-link as owner
 * 4. Otherwise return viewer with no link
 */
export async function resolveDiscordUserRole(
  admin: SupabaseClient,
  tenantId: string,
  discordUserId: string
): Promise<DiscordRoleResolution> {
  // 1. Check for existing link
  const { data: existingLink, error: linkError } = await admin
    .from("tenant_discord_links")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  if (linkError) {
    console.error("[discord-role-resolver] Link lookup failed:", linkError.message);
    return { role: "viewer", userId: null, linked: false, autoLinked: false };
  }

  if (existingLink) {
    // 2. Resolve role from tenant_members
    const { data: member, error: memberError } = await admin
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", existingLink.user_id)
      .eq("status", "active")
      .maybeSingle();

    if (memberError) {
      console.error("[discord-role-resolver] Member lookup failed:", memberError.message);
      return { role: "viewer", userId: existingLink.user_id, linked: true, autoLinked: false };
    }

    const role = (member?.role as TenantRole) || "viewer";
    return { role, userId: existingLink.user_id, linked: true, autoLinked: false };
  }

  // 3. Check if tenant has ANY discord links yet
  const { count, error: countError } = await admin
    .from("tenant_discord_links")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (countError) {
    console.error("[discord-role-resolver] Count failed:", countError.message);
    return { role: "viewer", userId: null, linked: false, autoLinked: false };
  }

  if ((count ?? 0) === 0) {
    // Auto-link: find the owner in tenant_members
    const { data: ownerMember, error: ownerError } = await admin
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("role", "owner")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (ownerError || !ownerMember) {
      console.error("[discord-role-resolver] Owner lookup failed:", ownerError?.message);
      return { role: "viewer", userId: null, linked: false, autoLinked: false };
    }

    // Insert auto-link
    const { error: insertError } = await admin
      .from("tenant_discord_links")
      .insert({
        tenant_id: tenantId,
        discord_user_id: discordUserId,
        user_id: ownerMember.user_id,
        linked_via: "auto",
      });

    if (insertError) {
      // Unique constraint race — another request may have linked first
      if (insertError.code === "23505") {
        return resolveDiscordUserRole(admin, tenantId, discordUserId);
      }
      console.error("[discord-role-resolver] Auto-link insert failed:", insertError.message);
      return { role: "viewer", userId: null, linked: false, autoLinked: false };
    }

    return { role: "owner", userId: ownerMember.user_id, linked: true, autoLinked: true };
  }

  // 4. Unlinked user on a tenant that already has links
  return { role: "viewer", userId: null, linked: false, autoLinked: false };
}
