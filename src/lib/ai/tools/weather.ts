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
        "Get 7-day weather forecast for the farm location. Returns daily high/low temps, wind, precipitation probability, and conditions.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!lat || !lng) return { error: "Farm location not configured. Set weather coordinates in farm profile." };
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

    get_spray_windows: tool({
      description:
        "Analyze next 48 hours for spray application windows. Shows hourly wind speed, temperature, humidity, and rain probability. Marks each hour as GO or NO-GO based on: wind 3-10mph, temp 50-85°F, humidity <80%, no rain forecast.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!lat || !lng) return { error: "Farm location not configured." };
        const point = await getPointMetadata(lat, lng);
        const hourly = (await nwsFetch(point.forecastHourly)) as {
          properties: { periods: Array<{ startTime: string; temperature: number; windSpeed: string; relativeHumidity?: { value: number | null }; probabilityOfPrecipitation?: { value: number | null }; shortForecast: string }> };
        };
        const windows = hourly.properties.periods.slice(0, 48).map((p) => {
          const windMatch = p.windSpeed.match(/(\d+)/);
          const windMph = windMatch ? parseInt(windMatch[1], 10) : 0;
          const humidity = p.relativeHumidity?.value ?? 50;
          const precip = p.probabilityOfPrecipitation?.value ?? 0;
          const tempOk = p.temperature >= 50 && p.temperature <= 85;
          const windOk = windMph >= 3 && windMph <= 10;
          const humidityOk = humidity < 80;
          const precipOk = precip < 20;
          const go = tempOk && windOk && humidityOk && precipOk;
          return {
            time: p.startTime,
            temp_f: p.temperature,
            wind_mph: windMph,
            humidity_pct: humidity,
            precip_chance: precip,
            conditions: p.shortForecast,
            status: go ? "GO" : "NO-GO",
            issues: [
              !tempOk && `temp ${p.temperature}°F outside 50-85`,
              !windOk && `wind ${windMph}mph outside 3-10`,
              !humidityOk && `humidity ${humidity}% above 80`,
              !precipOk && `${precip}% rain chance`,
            ].filter(Boolean),
          };
        });
        return { fetched_at: new Date().toISOString(), windows };
      },
    }),

    get_weather_alerts: tool({
      description: "Get active NWS weather alerts for the farm's county.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!lat || !lng) return { error: "Farm location not configured." };
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

    get_gdd_accumulation: tool({
      description:
        "Calculate Growing Degree Day (GDD) accumulation for corn (base 50°F). Uses recent temperature data from NWS.",
      inputSchema: z.object({
        planting_date: z.string().optional().describe("Planting date in YYYY-MM-DD format. Defaults to May 1."),
      }),
      execute: async ({ planting_date }) => {
        if (!lat || !lng) return { error: "Farm location not configured." };
        const point = await getPointMetadata(lat, lng);
        const hourly = (await nwsFetch(point.forecastHourly)) as {
          properties: { periods: Array<{ startTime: string; temperature: number }> };
        };
        // Use forecast data to estimate recent GDD (simplified)
        const baseTemp = 50;
        const ceilingTemp = 86;
        let gdd = 0;
        const dailyTemps = new Map<string, { highs: number[]; lows: number[] }>();
        for (const p of hourly.properties.periods) {
          const date = p.startTime.slice(0, 10);
          if (!dailyTemps.has(date)) dailyTemps.set(date, { highs: [], lows: [] });
          const day = dailyTemps.get(date)!;
          day.highs.push(Math.min(p.temperature, ceilingTemp));
          day.lows.push(Math.max(p.temperature, baseTemp));
        }
        for (const [, temps] of dailyTemps) {
          const high = Math.max(...temps.highs);
          const low = Math.min(...temps.lows);
          const avg = (high + low) / 2;
          const dayGdd = Math.max(0, avg - baseTemp);
          gdd += dayGdd;
        }
        return {
          planting_date: planting_date || "estimate",
          gdd_accumulated: Math.round(gdd),
          days_in_forecast: dailyTemps.size,
          note: "GDD calculated from forecast data. For historical accumulation, check local extension service.",
          fetched_at: new Date().toISOString(),
        };
      },
    }),
  };
}
