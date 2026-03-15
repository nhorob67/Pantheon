import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_EMAIL_DOMAIN = "pantheon.app";
const MAX_SLUG_LENGTH = 63;

export interface EmailIdentityRecord {
  id: string;
  customer_id: string;
  tenant_id: string | null;
  instance_id: string | null;
  agent_id: string | null;
  identity_type: "team" | "agent";
  provider: string | null;
  provider_mailbox_id: string | null;
  provider_metadata: Record<string, unknown>;
  slug: string;
  address: string;
  sender_alias: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class EmailIdentityConflictError extends Error {}
export class EmailIdentityNotFoundError extends Error {}
export class EmailIdentitySlugLockedError extends Error {}

function getEmailDomain(): string {
  return (process.env.PANTHEON_EMAIL_DOMAIN || DEFAULT_EMAIL_DOMAIN).toLowerCase();
}

function stripToAscii(value: string): string {
  return value.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
}

export function slugifyEmailPart(value: string): string {
  const cleaned = stripToAscii(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!cleaned) {
    return "pantheon-account";
  }

  return cleaned.slice(0, MAX_SLUG_LENGTH).replace(/-$/, "");
}

function slugWithSuffix(baseSlug: string, suffix: number): string {
  if (suffix <= 1) {
    return baseSlug.slice(0, MAX_SLUG_LENGTH);
  }

  const suffixText = `-${suffix}`;
  const maxBaseLength = MAX_SLUG_LENGTH - suffixText.length;
  const trimmedBase = baseSlug.slice(0, maxBaseLength).replace(/-$/, "");
  return `${trimmedBase}${suffixText}`;
}

export function buildAddressFromSlug(slug: string): string {
  return `${slug}@${getEmailDomain()}`;
}

interface EnsureEmailIdentityInput {
  customerId: string;
  tenantId?: string | null;
  instanceId?: string | null;
  teamName?: string | null;
  customerEmail?: string | null;
  requestedSlug?: string;
}

function buildSlugSeed(input: EnsureEmailIdentityInput): string {
  if (input.teamName && input.teamName.trim().length > 0) {
    return input.teamName;
  }

  if (input.customerEmail && input.customerEmail.includes("@")) {
    return input.customerEmail.split("@")[0];
  }

  return `pantheon-${input.customerId.slice(0, 8)}`;
}

export async function getActiveEmailIdentity(
  customerId: string
): Promise<EmailIdentityRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_identities")
    .select("*")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .eq("identity_type", "team")
    .is("agent_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as EmailIdentityRecord | null) || null;
}

export async function getActiveAgentEmailIdentityForTenant(
  tenantId: string,
  agentId: string
): Promise<EmailIdentityRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_identities")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("agent_id", agentId)
    .eq("identity_type", "agent")
    .eq("is_active", true)
    .maybeSingle();

  return (data as EmailIdentityRecord | null) || null;
}

export async function getLatestAgentEmailIdentityForTenant(
  tenantId: string,
  agentId: string
): Promise<EmailIdentityRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_identities")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("agent_id", agentId)
    .eq("identity_type", "agent")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as EmailIdentityRecord | null) || null;
}

export async function getEmailIdentityById(
  identityId: string
): Promise<EmailIdentityRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_identities")
    .select("*")
    .eq("id", identityId)
    .maybeSingle();

  return (data as EmailIdentityRecord | null) || null;
}

async function syncIdentityInstanceId(
  identity: EmailIdentityRecord,
  instanceId?: string | null
): Promise<EmailIdentityRecord> {
  if (!instanceId) {
    return identity;
  }

  if (identity.instance_id === instanceId) {
    return identity;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_identities")
    .update({ instance_id: instanceId })
    .eq("id", identity.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as EmailIdentityRecord;
}

async function getOrSyncActiveIdentity(
  customerId: string,
  instanceId?: string | null
): Promise<EmailIdentityRecord | null> {
  const existing = await getActiveEmailIdentity(customerId);
  if (!existing) {
    return null;
  }

  return syncIdentityInstanceId(existing, instanceId);
}

async function getLatestTeamIdentity(
  customerId: string
): Promise<EmailIdentityRecord | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_identities")
    .select("*")
    .eq("customer_id", customerId)
    .eq("identity_type", "team")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as EmailIdentityRecord | null) || null;
}

function resolveDesiredSlug(
  requestedSlug: string | undefined,
  fallbackSeed: string
): string {
  return requestedSlug && requestedSlug.length > 0
    ? requestedSlug
    : slugifyEmailPart(fallbackSeed);
}

async function reactivateExistingIdentity(
  identity: EmailIdentityRecord,
  input: {
    instanceId?: string | null;
    tenantId?: string | null;
    requestedSlug?: string;
  }
): Promise<EmailIdentityRecord> {
  const admin = createAdminClient();
  const nextSlug = input.requestedSlug?.trim().toLowerCase();

  if (
    nextSlug &&
    nextSlug !== identity.slug &&
    identity.provider_mailbox_id
  ) {
    throw new EmailIdentitySlugLockedError(
      "This email slug can't be changed after the inbox is provisioned"
    );
  }

  const finalSlug = nextSlug && !identity.provider_mailbox_id
    ? nextSlug
    : identity.slug;
  const nextAddress = buildAddressFromSlug(finalSlug);
  const nextSenderAlias = nextAddress;

  const payload: Record<string, string | boolean | null> = {
    is_active: true,
    slug: finalSlug,
    address: nextAddress,
    sender_alias: nextSenderAlias,
    updated_at: new Date().toISOString(),
  };

  if (input.instanceId !== undefined) {
    payload.instance_id = input.instanceId;
  }

  if (input.tenantId !== undefined) {
    payload.tenant_id = input.tenantId;
  }

  const { data, error } = await admin
    .from("email_identities")
    .update(payload)
    .eq("id", identity.id)
    .select("*")
    .single();

  if (error?.code === "23505") {
    throw new EmailIdentityConflictError("This email slug is already taken");
  }

  if (error) {
    throw new Error(error.message);
  }

  return data as EmailIdentityRecord;
}

export async function ensureEmailIdentity(
  input: EnsureEmailIdentityInput
): Promise<EmailIdentityRecord> {
  const admin = createAdminClient();
  const existing = await getOrSyncActiveIdentity(
    input.customerId,
    input.instanceId || null
  );

  if (existing) {
    if (
      input.requestedSlug &&
      input.requestedSlug !== existing.slug &&
      existing.provider_mailbox_id
    ) {
      throw new EmailIdentitySlugLockedError(
        "This email slug can't be changed after the inbox is provisioned"
      );
    }
    return existing;
  }

  const previous = await getLatestTeamIdentity(input.customerId);
  if (previous) {
    return reactivateExistingIdentity(previous, {
      instanceId: input.instanceId || null,
      tenantId: input.tenantId || null,
      requestedSlug: input.requestedSlug,
    });
  }

  const baseSlug = resolveDesiredSlug(
    input.requestedSlug,
    buildSlugSeed(input)
  );

  for (let i = 1; i <= 100; i++) {
    const slug = slugWithSuffix(baseSlug, i);
    const address = buildAddressFromSlug(slug);
    const senderAlias = address;

    const { data, error } = await admin
      .from("email_identities")
      .insert({
        customer_id: input.customerId,
        tenant_id: input.tenantId || null,
        instance_id: input.instanceId || null,
        identity_type: "team",
        slug,
        address,
        sender_alias: senderAlias,
        is_active: true,
      })
      .select("*")
      .single();

    if (!error && data) {
      return data as EmailIdentityRecord;
    }

    if (error && error.code === "23505") {
      // Another request may have created the active identity concurrently.
      const concurrentIdentity = await getOrSyncActiveIdentity(
        input.customerId,
        input.instanceId || null
      );

      if (concurrentIdentity) {
        return concurrentIdentity;
      }

      continue;
    }

    if (error) {
      throw new Error(error.message);
    }
  }

  throw new Error("Unable to generate a unique email address");
}

interface UpdateEmailIdentitySlugInput {
  customerId: string;
  slug: string;
  instanceId?: string | null;
}

export async function updateEmailIdentitySlug(
  input: UpdateEmailIdentitySlugInput
): Promise<EmailIdentityRecord> {
  const admin = createAdminClient();
  const current = await getActiveEmailIdentity(input.customerId);

  if (!current) {
    throw new EmailIdentityNotFoundError("Email identity not found");
  }

  if (input.slug === current.slug) {
    return input.instanceId
      ? syncIdentityInstanceId(current, input.instanceId)
      : current;
  }

  if (current.provider_mailbox_id) {
    throw new EmailIdentitySlugLockedError(
      "This email slug can't be changed after the inbox is provisioned"
    );
  }

  const nextAddress = buildAddressFromSlug(input.slug);
  const payload: Record<string, string | null> = {
    slug: input.slug,
    address: nextAddress,
    sender_alias: nextAddress,
  };

  if (input.instanceId) {
    payload.instance_id = input.instanceId;
  }

  const { data, error } = await admin
    .from("email_identities")
    .update(payload)
    .eq("id", current.id)
    .select("*")
    .single();

  if (error?.code === "23505") {
    throw new EmailIdentityConflictError("This email slug is already taken");
  }

  if (error) {
    throw new Error(error.message);
  }

  return data as EmailIdentityRecord;
}

interface EnsureAgentEmailIdentityInput {
  customerId: string;
  tenantId: string;
  agentId: string;
  agentDisplayName: string;
  teamSlug?: string;
  instanceId?: string | null;
  requestedSlug?: string;
}

export async function ensureAgentEmailIdentity(
  input: EnsureAgentEmailIdentityInput
): Promise<EmailIdentityRecord> {
  const admin = createAdminClient();

  // Check if agent already has an active identity
  const existing = await getActiveAgentEmailIdentityForTenant(
    input.tenantId,
    input.agentId
  );
  if (existing) {
    if (
      input.requestedSlug &&
      input.requestedSlug !== existing.slug &&
      existing.provider_mailbox_id
    ) {
      throw new EmailIdentitySlugLockedError(
        "This email slug can't be changed after the inbox is provisioned"
      );
    }
    return existing;
  }

  const previous = await getLatestAgentEmailIdentityForTenant(
    input.tenantId,
    input.agentId
  );
  if (previous) {
    return reactivateExistingIdentity(previous, {
      instanceId: input.instanceId || null,
      tenantId: input.tenantId,
      requestedSlug: input.requestedSlug,
    });
  }

  const teamPart = input.teamSlug
    ? slugifyEmailPart(input.teamSlug)
    : slugifyEmailPart(`team-${input.customerId.slice(0, 8)}`);
  const agentPart = slugifyEmailPart(input.agentDisplayName);
  const generatedSlug = `${teamPart}-${agentPart}`.slice(0, MAX_SLUG_LENGTH).replace(/-$/, "");
  const baseSlug = resolveDesiredSlug(input.requestedSlug, generatedSlug);

  for (let i = 1; i <= 100; i++) {
    const slug = slugWithSuffix(baseSlug, i);
    const address = buildAddressFromSlug(slug);
    const senderAlias = address;

    const { data, error } = await admin
      .from("email_identities")
      .insert({
        customer_id: input.customerId,
        tenant_id: input.tenantId,
        instance_id: input.instanceId || null,
        agent_id: input.agentId,
        identity_type: "agent",
        slug,
        address,
        sender_alias: senderAlias,
        is_active: true,
      })
      .select("*")
      .single();

    if (!error && data) {
      return data as EmailIdentityRecord;
    }

    if (error && error.code === "23505") {
      // Concurrent request may have created the identity
      const concurrentIdentity = await getActiveAgentEmailIdentityForTenant(
        input.tenantId,
        input.agentId
      );
      if (concurrentIdentity) {
        return concurrentIdentity;
      }
      continue;
    }

    if (error) {
      throw new Error(error.message);
    }
  }

  throw new Error("Unable to generate a unique email address for agent");
}

export async function deactivateAgentEmailIdentity(
  tenantId: string,
  agentId: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("email_identities")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("agent_id", agentId)
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAgentEmailIdentitySlug(
  tenantId: string,
  agentId: string,
  slug: string
): Promise<EmailIdentityRecord> {
  const admin = createAdminClient();
  const current = await getActiveAgentEmailIdentityForTenant(tenantId, agentId);

  if (!current) {
    throw new EmailIdentityNotFoundError("Agent email identity not found");
  }

  if (slug === current.slug) {
    return current;
  }

  if (current.provider_mailbox_id) {
    throw new EmailIdentitySlugLockedError(
      "This email slug can't be changed after the inbox is provisioned"
    );
  }

  const nextAddress = buildAddressFromSlug(slug);
  const { data, error } = await admin
    .from("email_identities")
    .update({
      slug,
      address: nextAddress,
      sender_alias: nextAddress,
    })
    .eq("id", current.id)
    .select("*")
    .single();

  if (error?.code === "23505") {
    throw new EmailIdentityConflictError("This email slug is already taken");
  }

  if (error) {
    throw new Error(error.message);
  }

  return data as EmailIdentityRecord;
}
