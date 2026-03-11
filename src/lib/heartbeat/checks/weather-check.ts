import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheapCheckResult } from "@/types/heartbeat";

const NWS_BASE_URL = "https://api.weather.gov";
const USER_AGENT = "Pantheon/1.0 (contact@pantheon.app)";

export async function checkWeatherSevere(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string
): Promise<CheapCheckResult> {
  const { data: profile } = await admin
    .from("farm_profiles")
    .select("weather_lat, weather_lng")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!profile?.weather_lat || !profile?.weather_lng) {
    return {
      status: "ok",
      summary: "No farm location configured",
      observability: {
        location_configured: false,
      },
    };
  }

  try {
    const pointRes = await fetch(
      `${NWS_BASE_URL}/points/${profile.weather_lat},${profile.weather_lng}`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!pointRes.ok) return { status: "error", summary: `NWS points API ${pointRes.status}` };
    const pointData = (await pointRes.json()) as {
      properties: { county: string };
    };

    const countyUrl = pointData.properties.county;
    if (!countyUrl) {
      return {
        status: "ok",
        summary: "County zone not available",
        observability: {
          location_configured: true,
          zone_id: null,
        },
      };
    }
    const zoneId = countyUrl.split("/").pop();

    const alertRes = await fetch(
      `${NWS_BASE_URL}/alerts/active/zone/${zoneId}`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!alertRes.ok) return { status: "error", summary: `NWS alerts API ${alertRes.status}` };
    const alertData = (await alertRes.json()) as {
      features: Array<{
        properties: {
          headline: string;
          severity: string;
          event: string;
          description: string;
          expires: string;
        };
      }>;
    };

    const severeAlerts = alertData.features.filter((f) => {
      const sev = f.properties.severity;
      return sev === "Severe" || sev === "Extreme";
    });

    if (severeAlerts.length === 0) {
      return {
        status: "ok",
        summary: "No severe weather alerts",
        observability: {
          location_configured: true,
          zone_id: zoneId || null,
          severe_alert_count: 0,
          latest_expires_at: null,
        },
      };
    }

    return {
      status: "alert",
      summary: `${severeAlerts.length} severe weather alert(s): ${severeAlerts.map((a) => a.properties.event).join(", ")}`,
      data: severeAlerts.map((a) => ({
        headline: a.properties.headline,
        severity: a.properties.severity,
        event: a.properties.event,
        description: a.properties.description.slice(0, 500),
        expires: a.properties.expires,
      })),
      observability: {
        location_configured: true,
        zone_id: zoneId || null,
        severe_alert_count: severeAlerts.length,
        latest_expires_at: severeAlerts
          .map((alert) => alert.properties.expires)
          .filter((value) => typeof value === "string" && value.length > 0)
          .sort()
          .slice(-1)[0] ?? null,
      },
    };
  } catch (err) {
    return {
      status: "error",
      summary: `Weather check failed: ${err instanceof Error ? err.message : "unknown"}`,
      observability: {
        location_configured: true,
      },
    };
  }
}
