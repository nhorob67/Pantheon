import { tool } from "ai";
import { z } from "zod";

const NWS_BASE_URL = "https://api.weather.gov";
const USER_AGENT = "Pantheon/1.0 (contact@pantheon.app)";

async function nwsFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`NWS API ${res.status}: ${url}`);
  return res.json();
}

async function getPointMetadata(lat: number, lng: number) {
  const data = (await nwsFetch(`${NWS_BASE_URL}/points/${lat},${lng}`)) as {
    properties: { forecast: string; forecastHourly: string; county: string; timeZone: string };
  };
  return data.properties;
}

export function createWeatherTools(lat: number | null, lng: number | null) {
  return {
    get_weather_forecast: tool({
      description:
        "Get 7-day weather forecast for the configured location. Returns daily high/low temps, wind, precipitation probability, and conditions.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!lat || !lng) return { error: "Location not configured. Set weather coordinates in team profile." };
        const point = await getPointMetadata(lat, lng);
        const forecast = (await nwsFetch(point.forecast)) as {
          properties: { periods: Array<{ name: string; temperature: number; temperatureUnit: string; windSpeed: string; windDirection: string; shortForecast: string; detailedForecast: string; probabilityOfPrecipitation?: { value: number | null } }> };
        };
        return {
          timezone: point.timeZone,
          fetched_at: new Date().toISOString(),
          periods: forecast.properties.periods.slice(0, 14).map((p) => ({
            name: p.name,
            temp: `${p.temperature}°${p.temperatureUnit}`,
            wind: `${p.windSpeed} ${p.windDirection}`,
            forecast: p.shortForecast,
            precip_chance: p.probabilityOfPrecipitation?.value ?? null,
            detail: p.detailedForecast,
          })),
        };
      },
    }),

    get_weather_alerts: tool({
      description: "Get active NWS weather alerts for the configured location's county.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!lat || !lng) return { error: "Location not configured." };
        const point = await getPointMetadata(lat, lng);
        const countyUrl = point.county;
        if (!countyUrl) return { alerts: [], message: "County zone not available." };
        const zoneId = countyUrl.split("/").pop();
        const alertData = (await nwsFetch(`${NWS_BASE_URL}/alerts/active/zone/${zoneId}`)) as {
          features: Array<{ properties: { headline: string; severity: string; event: string; description: string; expires: string } }>;
        };
        return {
          fetched_at: new Date().toISOString(),
          alerts: alertData.features.map((f) => ({
            headline: f.properties.headline,
            severity: f.properties.severity,
            event: f.properties.event,
            description: f.properties.description.slice(0, 500),
            expires: f.properties.expires,
          })),
        };
      },
    }),
  };
}
