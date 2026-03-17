export interface WebToolAvailabilityInput {
  tenantStatus: string | undefined;
  rolloutEnabled: boolean;
  webResearchPaused: boolean;
}

export function isWebToolAvailable(input: WebToolAvailabilityInput): boolean {
  if (input.webResearchPaused) return false;
  if (!input.rolloutEnabled) return false;
  return input.tenantStatus === "enabled";
}
