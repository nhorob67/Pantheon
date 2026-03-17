export interface DelegationToolAvailabilityInput {
  tenantStatus: string | undefined;
  rolloutEnabled: boolean;
  delegationPaused: boolean;
}

export function isDelegationToolAvailable(input: DelegationToolAvailabilityInput): boolean {
  if (input.delegationPaused) return false;
  if (!input.rolloutEnabled) return false;
  return input.tenantStatus === "enabled";
}
