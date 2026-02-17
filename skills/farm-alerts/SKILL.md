# Farm Alerts Skill

Proactive farm alerts delivered through the OpenClaw instance to the farmer's Discord server. These are implemented as cron-triggered checks that run inside the existing assistant.

## Alert Types

### 1. Severe Weather Alerts
- **Source:** NWS Alerts API (`/alerts/active?point={lat},{lng}`)
- **Schedule:** Every 2 hours
- **Trigger:** Any alert with severity >= "Moderate" (Moderate, Severe, Extreme)
- **Behavior:** Check the NWS alerts API for the farm's coordinates. If there are active severe weather alerts, summarize them and post to Discord. If there are no alerts, do nothing — do NOT send a "no alerts" message.

### 2. Grain Price Movement Alerts
- **Source:** Grain bids skill (scrapes elevator websites)
- **Schedule:** 9 AM and 2 PM, Monday–Friday
- **Trigger:** Price change exceeds the configured threshold (default: 10 cents/bushel)
- **Behavior:** Compare current cash bids against the last known prices stored in the Memory MCP server. If any crop's price has moved more than the threshold, alert the farmer. Store the new prices in memory for next comparison.
- **Memory keys:** `last_bids:{elevator_name}:{crop}` → price in cents

### 3. Scale Ticket Anomaly Alerts
- **Source:** Scale tickets SQLite database
- **Schedule:** 6 PM, Monday–Friday
- **Trigger:** Any of:
  - Net weight variance > 2 standard deviations from the 30-day average for that crop
  - Moisture percentage outside normal range for the crop (e.g., corn > 15.5%, soybeans > 13%)
  - Duplicate ticket detection (same elevator, crop, weight within 1% on the same day)
- **Behavior:** Query today's scale tickets from SQLite. Run anomaly checks against historical data. If anomalies found, summarize and post to Discord. If no anomalies, do nothing.

## Architecture

These alerts are NOT separate services. They are cron job entries injected into the OpenClaw config when the farmer enables them in their alert preferences. The OpenClaw instance already has access to all the required skills and data sources.

### Config Injection
When alert preferences are saved, `rebuildAndDeploy()` fetches the preferences and injects cron entries:

```json
{
  "weather-alert-check-advisor": {
    "schedule": "0 */2 * * *",
    "timezone": "America/Chicago",
    "agentId": "advisor",
    "message": "Check the NWS alerts API for severe weather..."
  }
}
```

### Cron Message Templates
Each cron job message is a carefully crafted prompt that:
1. Instructs the agent to check the relevant data source
2. Defines the alert criteria
3. Explicitly states to NOT post if nothing noteworthy is found
4. Specifies the alert format for Discord
