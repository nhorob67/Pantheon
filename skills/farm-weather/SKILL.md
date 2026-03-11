---
name: farm-weather
description: Weather forecasts, current conditions, and ag-specific weather intelligence using NWS API and browser.
metadata:
  openclaw:
    requires:
      config:
        - browser.enabled
---

# Farm Weather Skill

## Purpose
Provide accurate, agriculture-relevant weather information for the farmer's
location. Primary data source is the National Weather Service (NWS) API
(free, no API key required). Falls back to browser-based weather lookups
when the API is insufficient.

## Configuration
- `latitude`: Farmer's latitude
- `longitude`: Farmer's longitude
- `location_name`: Display name (e.g., "near Fargo, ND")
- `timezone`: IANA timezone (e.g., "America/Chicago")

## Data Sources

### Primary: NWS API (api.weather.gov)
Free, reliable, no authentication required. Use for:
- Point forecasts
- Hourly forecasts
- Active alerts
- Current observations from nearest station

**Key endpoints:**
1. Get grid point: `GET https://api.weather.gov/points/{lat},{lng}`
   → Returns `forecast`, `forecastHourly`, `forecastGridData` URLs
2. Get forecast: `GET {forecast_url}` → 7-day forecast in periods
3. Get hourly: `GET {forecastHourly_url}` → Hourly forecast data
4. Get alerts: `GET https://api.weather.gov/alerts/active?point={lat},{lng}`
5. Get observations: `GET https://api.weather.gov/stations/{stationId}/observations/latest`

**Important:** The NWS API requires a `User-Agent` header. Use:
`User-Agent: Pantheon/1.0 (contact@pantheon.app)`

Use bash `curl` commands to call these endpoints. Parse the JSON response
to extract relevant fields.

Example curl commands:
```bash
# Get grid point info
curl -sf -H "User-Agent: Pantheon/1.0 (contact@pantheon.app)" \
  "https://api.weather.gov/points/46.8772,-96.7898"

# Get forecast (use URL from grid point response)
curl -sf -H "User-Agent: Pantheon/1.0 (contact@pantheon.app)" \
  "https://api.weather.gov/gridpoints/FGF/78,47/forecast"

# Get active alerts for a location
curl -sf -H "User-Agent: Pantheon/1.0 (contact@pantheon.app)" \
  "https://api.weather.gov/alerts/active?point=46.8772,-96.7898"
```

### Secondary: Browser
Use for supplementary data not available via NWS API:
- Soil temperature maps (e.g., Greencast, NDAWN)
- Drought monitor (droughtmonitor.unl.edu)
- Crop-specific weather tools

## Morning Weather Briefing

This runs automatically via cron at 6:00 AM local time. Generate a concise
briefing covering:

```
☀️ Morning Weather — {{location_name}}
{{date}}

TODAY: {{short_forecast}}
  High: {{high}}°F | Low: {{low}}°F
  Wind: {{wind_speed}} {{wind_direction}}
  Precip: {{precip_chance}}% chance, {{precip_amount}} expected
  Humidity: {{humidity}}%

NEXT 3 DAYS:
  {{day2}}: {{short2}} | H {{high2}} L {{low2}}
  {{day3}}: {{short3}} | H {{high3}} L {{low3}}
  {{day4}}: {{short4}} | H {{high4}} L {{low4}}

⚠️ ALERTS: {{active_alerts or "None"}}

🌾 AG NOTES:
  - {{spray_window_assessment}}
  - {{field_work_assessment}}
  - {{any_freeze_or_heat_warnings}}
```

## Spray Window Assessment

When asked about spray windows (or as part of the morning briefing during
growing season April-October):

1. Fetch hourly forecast for the next 48 hours.
2. Identify windows where ALL of these conditions are met:
   - Wind speed: 3-10 mph (too calm = inversion risk, too high = drift)
   - Temperature: 50-85°F
   - No precipitation in the current hour or next 2 hours
   - Humidity: <80% (high humidity slows drying)
3. Present as time blocks:
   ```
   🟢 SPRAY WINDOWS (next 48hrs):
     Today 7AM-11AM: Wind 5-8mph SW, 62-71°F, 0% precip ✓
     Today 5PM-8PM:  Wind 4-6mph S, 68-65°F, 0% precip ✓
     Tomorrow 6AM-2PM: Wind 3-7mph NW, 58-74°F, 0% precip ✓

   🔴 AVOID:
     Today 12PM-4PM: Wind 15-20mph gusting 25mph
     Tomorrow 4PM+: 60% chance thunderstorms
   ```

## GDD (Growing Degree Day) Calculation

When asked about GDD:
- Base temperature for corn: 50°F
- Formula: GDD = ((High + Low) / 2) - Base
- Cap high at 86°F and low at 50°F before averaging
- Accumulate from planting date (farmer may need to provide this)
- Fetch historical temps via NWS grid data if available

## Error Handling

- If NWS API returns an error, retry once after 5 seconds.
- If the API is down, fall back to browser-based lookup on weather.gov.
- Always include the data timestamp in the response.
- For severe weather alerts, always display them prominently regardless
  of what the farmer originally asked about.

## Units

- Temperature: Fahrenheit
- Wind: mph
- Precipitation: inches
- Pressure: inHg (if relevant)
- All times in farmer's local timezone
