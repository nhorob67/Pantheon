import type { SupabaseClient } from "@supabase/supabase-js";
import { safeErrorMessage } from "@/lib/security/safe-error";
import type {
  ExtensionCatalogItem,
  ExtensionCustomerTrustPolicy,
  ExtensionSourceType,
  ExtensionTrustPolicy,
} from "@/types/extensibility";

export const EXTENSION_SOURCE_TYPES: ExtensionSourceType[] = [
  "local",
  "npm",
  "git",
  "clawhub",
  "internal",
];

export const DEFAULT_REQUIRED_VERIFIED_SOURCE_TYPES: ExtensionSourceType[] = [
  "npm",
  "git",
  "clawhub",
];

function normalizeSourceTypes(
  values: string[] | null | undefined,
  fallback: ExtensionSourceType[]
): ExtensionSourceType[] {
  if (!values || values.length === 0) {
    return [...fallback];
  }

  const validTypes = new Set<ExtensionSourceType>(EXTENSION_SOURCE_TYPES);
  const deduped: ExtensionSourceType[] = [];

  for (const value of values) {
    const normalized = value.trim().toLowerCase() as ExtensionSourceType;
    if (!validTypes.has(normalized) || deduped.includes(normalized)) {
      continue;
    }
    deduped.push(normalized);
  }

  return deduped.length > 0 ? deduped : [...fallback];
}

function normalizeRequiredVerifiedSourceTypes(
  allowedSourceTypes: ExtensionSourceType[],
  values: string[] | null | undefined
): ExtensionSourceType[] {
  const normalized = normalizeSourceTypes(
    values,
    DEFAULT_REQUIRED_VERIFIED_SOURCE_TYPES
  );
  const allowed = new Set(allowedSourceTypes);
  return normalized.filter((value) => allowed.has(value));
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = (error as { code?: string }).code;
  return maybeCode === "42P01";
}

export function getDefaultExtensionTrustPolicy(): ExtensionTrustPolicy {
  return {
    allowed_source_types: [...EXTENSION_SOURCE_TYPES],
    require_verified_source_types: [...DEFAULT_REQUIRED_VERIFIED_SOURCE_TYPES],
  };
}

export function normalizeExtensionTrustPolicy(
  value?: Partial<ExtensionTrustPolicy> | null
): ExtensionTrustPolicy {
  const defaults = getDefaultExtensionTrustPolicy();
  const allowedSourceTypes = normalizeSourceTypes(
    value?.allowed_source_types ?? null,
    defaults.allowed_source_types
  );
  const requiredVerifiedSourceTypes = normalizeRequiredVerifiedSourceTypes(
    allowedSourceTypes,
    value?.require_verified_source_types ?? null
  );

  return {
    allowed_source_types: allowedSourceTypes,
    require_verified_source_types: requiredVerifiedSourceTypes,
  };
}

export async function loadCustomerExtensionTrustPolicy(
  admin: SupabaseClient,
  customerId: string
): Promise<ExtensionTrustPolicy> {
  const { data, error } = await admin
    .from("extension_customer_trust_policies")
    .select("allowed_source_types, require_verified_source_types")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return getDefaultExtensionTrustPolicy();
    }
    throw new Error(
      safeErrorMessage(error, "Failed to load customer extension trust policy")
    );
  }

  return normalizeExtensionTrustPolicy(
    (data || null) as Partial<ExtensionTrustPolicy> | null
  );
}

export async function upsertCustomerExtensionTrustPolicy(
  admin: SupabaseClient,
  params: {
    customerId: string;
    allowedSourceTypes: string[];
    requireVerifiedSourceTypes: string[];
    updatedBy: string | null;
  }
): Promise<ExtensionCustomerTrustPolicy> {
  const normalized = normalizeExtensionTrustPolicy({
    allowed_source_types: params.allowedSourceTypes as ExtensionSourceType[],
    require_verified_source_types:
      params.requireVerifiedSourceTypes as ExtensionSourceType[],
  });

  const { data, error } = await admin
    .from("extension_customer_trust_policies")
    .upsert(
      {
        customer_id: params.customerId,
        allowed_source_types: normalized.allowed_source_types,
        require_verified_source_types: normalized.require_verified_source_types,
        updated_by: params.updatedBy,
      },
      { onConflict: "customer_id" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error(
        "Extension trust policy schema is unavailable; apply migration 00015_extension_trust_policy.sql."
      );
    }
    throw new Error(
      safeErrorMessage(error, "Failed to update customer extension trust policy")
    );
  }

  return data as ExtensionCustomerTrustPolicy;
}

export interface ExtensionTrustDecision {
  allowed: boolean;
  reason?: string;
}

export function evaluateExtensionTrust(
  item: Pick<ExtensionCatalogItem, "source_type" | "verified" | "slug">,
  policy?: ExtensionTrustPolicy
): ExtensionTrustDecision {
  const normalizedPolicy = normalizeExtensionTrustPolicy(policy);
  const allowedSourceTypes = new Set(normalizedPolicy.allowed_source_types);

  if (!allowedSourceTypes.has(item.source_type)) {
    return {
      allowed: false,
      reason: `Extension '${item.slug}' source type '${item.source_type}' is blocked by trust policy`,
    };
  }

  const verifiedRequiredSourceTypes = new Set(
    normalizedPolicy.require_verified_source_types
  );

  if (verifiedRequiredSourceTypes.has(item.source_type) && !item.verified) {
    return {
      allowed: false,
      reason: `Extension '${item.slug}' is unverified for source type '${item.source_type}'`,
    };
  }

  return { allowed: true };
}
