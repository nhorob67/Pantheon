import {
  safeErrorMessage
} from "./chunk-R2V4UDE3.mjs";
import {
  __name,
  init_esm
} from "./chunk-262SQFPS.mjs";

// src/lib/security/audit.ts
init_esm();
function auditLog(entry) {
  console.log(
    JSON.stringify({
      type: "audit",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...entry
    })
  );
}
__name(auditLog, "auditLog");

// src/lib/queries/extensibility.ts
init_esm();
async function isKillSwitchEnabled(admin, switchKey) {
  const { data, error } = await admin.rpc(
    "is_kill_switch_enabled",
    { p_switch_key: switchKey }
  );
  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to resolve kill switch"));
  }
  return data === true;
}
__name(isKillSwitchEnabled, "isKillSwitchEnabled");
async function resolveCustomerFeatureFlag(admin, customerId, flagKey) {
  const { data, error } = await admin.rpc(
    "resolve_customer_feature_flag",
    {
      p_customer_id: customerId,
      p_flag_key: flagKey
    }
  );
  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to resolve customer feature flag"));
  }
  return data === true;
}
__name(resolveCustomerFeatureFlag, "resolveCustomerFeatureFlag");
async function isFeatureFlagEnabledOrDefaultTrue(admin, customerId, flagKey) {
  const normalizedFlagKey = flagKey.trim().toLowerCase();
  const { data: flag, error } = await admin.from("feature_flags").select("id").eq("flag_key", normalizedFlagKey).maybeSingle();
  if (error) {
    throw new Error(safeErrorMessage(error, "Failed to query feature flag"));
  }
  if (!flag) {
    return true;
  }
  return resolveCustomerFeatureFlag(admin, customerId, normalizedFlagKey);
}
__name(isFeatureFlagEnabledOrDefaultTrue, "isFeatureFlagEnabledOrDefaultTrue");

export {
  isKillSwitchEnabled,
  resolveCustomerFeatureFlag,
  isFeatureFlagEnabledOrDefaultTrue,
  auditLog
};
//# sourceMappingURL=chunk-XF5T4F7Q.mjs.map
