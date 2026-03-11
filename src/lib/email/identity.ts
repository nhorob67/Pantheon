import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_EMAIL_DOMAIN = "pantheon.app";
const MAX_SLUG_LENGTH = 63;

export interface EmailIdentityRecord {
  id: string;
  customer_id: string;
  instance_id: string | null;
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
  instanceId?: string | null;
  farmName?: string | null;
  customerEmail?: string | null;
}

function buildSlugSeed(input: EnsureEmailIdentityInput): string {
  if (input.farmName && input.farmName.trim().length > 0) {
    return input.farmName;
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

export async function ensureEmailIdentity(
  input: EnsureEmailIdentityInput
): Promise<EmailIdentityRecord> {
  const admin = createAdminClient();
  const existing = await getOrSyncActiveIdentity(
    input.customerId,
    input.instanceId || null
  );

  if (existing) {
    return existing;
  }

  const baseSlug = slugifyEmailPart(buildSlugSeed(input));

  for (let i = 1; i <= 100; i++) {
    const slug = slugWithSuffix(baseSlug, i);
    const address = buildAddressFromSlug(slug);
    const senderAlias = address;

    const { data, error } = await admin
      .from("email_identities")
      .insert({
        customer_id: input.customerId,
        instance_id: input.instanceId || null,
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
