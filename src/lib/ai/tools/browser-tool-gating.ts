export interface BrowserToolAvailabilityInput {
  tenantStatus: string | undefined;
  rolloutEnabled: boolean;
  browserPaused: boolean;
}

export function isBrowserToolAvailable(input: BrowserToolAvailabilityInput): boolean {
  if (input.browserPaused) return false;
  if (!input.rolloutEnabled) return false;
  return input.tenantStatus === "enabled";
}
