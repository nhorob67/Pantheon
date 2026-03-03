import type { ExtensionSourceType } from "../../types/extensibility.ts";

const TOOL_SOURCE_TYPES = new Set<ExtensionSourceType>([
  "local",
  "npm",
  "git",
  "clawhub",
  "internal",
]);

export interface TenantToolTrustContext {
  source_type: ExtensionSourceType;
  verified: boolean;
  slug: string;
}

export interface TenantToolTrustPolicyLike {
  allowed_source_types: ExtensionSourceType[];
  require_verified_source_types: ExtensionSourceType[];
}

function normalizeToolSourceType(value: unknown): ExtensionSourceType | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase() as ExtensionSourceType;
  return TOOL_SOURCE_TYPES.has(normalized) ? normalized : null;
}

export function resolveTenantToolTrustContext(
  toolKey: string,
  metadata: unknown
): TenantToolTrustContext | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const row = metadata as Record<string, unknown>;
  const sourceType = normalizeToolSourceType(row.source_type);
  if (!sourceType) {
    return null;
  }

  const slugRaw = typeof row.slug === "string" ? row.slug : toolKey;
  const slug = slugRaw.trim().length > 0 ? slugRaw.trim() : toolKey;

  return {
    source_type: sourceType,
    verified: row.verified === true,
    slug,
  };
}

export function evaluateTenantToolTrustDecision(
  trustContext: TenantToolTrustContext,
  policy: TenantToolTrustPolicyLike
): { allowed: boolean; reason?: string } {
  const allowed = new Set(policy.allowed_source_types);
  if (!allowed.has(trustContext.source_type)) {
    return {
      allowed: false,
      reason: `Extension '${trustContext.slug}' source type '${trustContext.source_type}' is blocked by trust policy`,
    };
  }

  const requireVerified = new Set(policy.require_verified_source_types);
  if (requireVerified.has(trustContext.source_type) && !trustContext.verified) {
    return {
      allowed: false,
      reason: `Extension '${trustContext.slug}' is unverified for source type '${trustContext.source_type}'`,
    };
  }

  return { allowed: true };
}
