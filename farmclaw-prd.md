# FarmClaw — Product Requirements Document

**Version:** 1.0
**Author:** Nick / Nerd Out Inc.
**Date:** February 11, 2026
**Purpose:** Guide Claude Code in building a managed OpenClaw platform for farmers.

---

## 1. Product Overview

### What We're Building

FarmClaw is a managed OpenClaw hosting platform purpose-built for farmers. Each customer gets a fully configured, always-on AI assistant accessible via WhatsApp, Telegram, or Discord. The assistant comes pre-loaded with farm-specific skills and a farm-advisor persona — no technical setup required from the farmer.

Think SimpleClaw, but vertical: optimized for agricultural operations with curated skills, farm-aware onboarding, and a persona that understands crop cycles, grain markets, and weather windows.

### Why It Matters

Farmers check grain prices, weather, and market conditions multiple times per day across scattered websites and apps. FarmClaw consolidates this into a single conversational interface on messaging platforms they already use. The farmer sends a message like "what's corn at the Fargo elevator?" or "what's the spray window look like tomorrow?" and gets an answer — no app to download, no dashboard to check.

### Business Model

- **Subscription:** $40/month per customer
- **API Passthrough:** LLM API usage billed at cost + 30% margin
- **Target Infrastructure Cost:** ~$8-12/customer/month (container + overhead)
- **Target Gross Margin:** 60-70% before API passthrough

---

## 2. Target User

Row crop farmers in the Upper Midwest (ND, SD, MN, MT, IA, NE) who:

- Actively market grain (not just dump at harvest)
- Check cash bids and futures prices daily
- Make field decisions based on weather forecasts
- Use WhatsApp, Telegram, or Discord regularly
- Are comfortable texting but don't want to manage servers, APIs, or technical configuration

Initial distribution: AI on Your Farm course buyers, Fullstack Ag community members, Nerd Out newsletter subscribers.

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FARMCLAW PLATFORM                     │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐   ┌─────────────┐ │
│  │  Dashboard   │    │ Provisioning │   │  Billing &   │ │
│  │  (Next.js /  │◄──►│    API       │   │  Metering   │ │
│  │   Vercel)    │    │  (Next.js    │   │  (Stripe +   │ │
│  │              │    │   API Routes)│   │   Supabase)  │ │
│  └──────┬───────┘    └──────┬───────┘   └──────┬───────┘ │
│         │                   │                   │         │
│         └───────────┬───────┴───────────────────┘         │
│                     │                                     │
│                     ▼                                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              HETZNER CLOUD CLUSTER                   │ │
│  │  ┌──────────┐                                       │ │
│  │  │ Coolify  │  (Orchestration & Management)         │ │
│  │  └────┬─────┘                                       │ │
│  │       │                                              │ │
│  │  ┌────▼─────┐ ┌──────────┐ ┌──────────┐            │ │
│  │  │ Customer │ │ Customer │ │ Customer │  ...        │ │
│  │  │ Container│ │ Container│ │ Container│             │ │
│  │  │ (OpenClaw│ │ (OpenClaw│ │ (OpenClaw│             │ │
│  │  │  + Farm  │ │  + Farm  │ │  + Farm  │             │ │
│  │  │  Skills) │ │  Skills) │ │  Skills) │             │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘            │ │
│  │       │             │             │                   │ │
│  │  ┌────▼─────┐ ┌────▼─────┐ ┌────▼─────┐            │ │
│  │  │Persistent│ │Persistent│ │Persistent│             │ │
│  │  │ Volume   │ │ Volume   │ │ Volume   │             │ │
│  │  └──────────┘ └──────────┘ └──────────┘             │ │
│  └─────────────────────────────────────────────────────┘ │
│                     │                                     │
│                     ▼                                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            EXTERNAL SERVICES                         │ │
│  │  Anthropic API ─── WhatsApp Business API             │ │
│  │  Telegram Bot API ─── Discord Bot API                │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Infrastructure Stack

| Component | Provider | Specification | Estimated Cost |
|---|---|---|---|
| Customer containers | Hetzner Cloud CPX21 | 3 vCPU, 4GB RAM, 80GB disk | ~€8.50/customer/month |
| Orchestration server | Hetzner Cloud CPX31 | 4 vCPU, 8GB RAM | ~€15/month (shared) |
| Orchestration software | Coolify (self-hosted) | Manages all customer containers | Free (open source) |
| Dashboard & API | Vercel | Next.js app, API routes | Free tier → Pro ($20/mo) |
| Database & Auth | Supabase | Postgres, Auth, Row-Level Security | Free tier → Pro ($25/mo) |
| Billing | Stripe | Subscriptions + metered billing | 2.9% + $0.30 per transaction |
| DNS & CDN | Cloudflare | DNS, SSL, edge caching | Free |
| Monitoring | Uptime Kuma (self-hosted) | On orchestration server | Free |
| LLM Provider | Anthropic (Claude) | Proxied through platform API key | Cost + 30% margin |

### 3.3 Why Hetzner + Coolify

Hetzner gives us the best price-to-performance for always-on containers in this use case. A CPX21 at €8.50/month with 4GB RAM comfortably runs the OpenClaw gateway + headless Chromium for browser-based skills. Coolify provides a self-hosted PaaS layer on top — a web dashboard to manage containers, handle deployments, view logs, and do rolling restarts. It's essentially a self-hosted Heroku/Railway, which eliminates per-unit platform fees that would eat margins at scale.

At 100 customers, infrastructure cost is roughly:
- 100 × €8.50 (customer containers) = €850
- 1 × €15 (Coolify orchestration server) = €15
- Total: ~€865/month ≈ $940/month
- Revenue: 100 × $40 = $4,000/month (before API passthrough revenue)

---

## 4. Dashboard & Customer Management

### 4.1 Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Hosting:** Vercel
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth (magic link email — farmers don't want to remember passwords)
- **Payments:** Stripe (subscription + metered billing component for API usage)
- **Styling:** Tailwind CSS

### 4.2 Database Schema

```sql
-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing', -- trialing, active, past_due, canceled
  plan TEXT DEFAULT 'standard', -- standard ($40/mo)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Farm profiles (populated during onboarding)
CREATE TABLE farm_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  farm_name TEXT,
  state TEXT NOT NULL, -- ND, SD, MN, etc.
  county TEXT,
  primary_crops TEXT[] DEFAULT '{}', -- '{corn, soybeans, wheat}'
  acres INTEGER,
  elevators TEXT[] DEFAULT '{}', -- preferred elevator names/URLs
  elevator_urls JSONB DEFAULT '[]', -- [{name, url, crops}]
  weather_location TEXT, -- city or zip for weather lookups
  weather_lat DECIMAL,
  weather_lng DECIMAL,
  timezone TEXT DEFAULT 'America/Chicago',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Instance tracking
CREATE TABLE instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  container_id TEXT, -- Coolify/Docker container ID
  server_ip TEXT,
  status TEXT DEFAULT 'provisioning', -- provisioning, running, stopped, error
  openclaw_version TEXT,
  last_health_check TIMESTAMPTZ,
  channel_type TEXT NOT NULL, -- whatsapp, telegram, discord
  channel_config JSONB DEFAULT '{}', -- encrypted channel tokens/config
  api_key_hash TEXT, -- hashed Anthropic API key (platform key, not customer's)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- API usage metering
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES instances(id),
  date DATE NOT NULL,
  model TEXT NOT NULL, -- claude-sonnet-4-5-20250929, etc.
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  estimated_cost_cents INTEGER DEFAULT 0, -- cost in cents before margin
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, date, model)
);

-- Skill configurations (per-customer overrides)
CREATE TABLE skill_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}', -- skill-specific config (elevator URLs, alert thresholds, etc.)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, skill_name)
);
```

### 4.3 Dashboard Pages

**Public Pages:**
- `/` — Landing page (marketing, pricing, testimonials)
- `/login` — Magic link login
- `/signup` — Registration → Stripe checkout → Onboarding wizard

**Authenticated Pages:**
- `/dashboard` — Instance status, quick stats (messages today, uptime, API usage)
- `/onboarding` — Multi-step wizard (farm profile, channel connection, skill configuration)
- `/settings/farm` — Edit farm profile (crops, elevators, location)
- `/settings/channels` — Connect/disconnect messaging channels
- `/settings/skills` — Enable/disable skills, configure skill-specific settings
- `/settings/billing` — Stripe customer portal (plan, invoices, payment method)
- `/usage` — API usage breakdown by day/model with cost estimates

### 4.4 Onboarding Wizard Flow

The onboarding wizard is critical — it collects the information needed to generate a personalized SOUL.md and configure skills.

**Step 1: Farm Profile**
- Farm name (optional, used in SOUL.md)
- State (dropdown: ND, SD, MN, MT, IA, NE, other)
- County (dropdown filtered by state)
- Primary crops (multi-select: Corn, Soybeans, Spring Wheat, Winter Wheat, Durum, Sunflowers, Canola, Barley, Dry Beans, Other)
- Total acres (number input)

**Step 2: Grain Marketing**
- Preferred elevators (search/add — name + website URL)
  - Pre-populate common elevators by state: CHS, ADM, Cargill locations, local co-ops
  - Allow custom entries with URL
- Commodities to track (auto-populated from crops selection)

**Step 3: Location & Weather**
- Nearest town or zip code (used for weather lookups)
- Auto-geocode to lat/lng for NWS API grid point
- Timezone auto-detection

**Step 4: Connect Channel**
- Choose one: WhatsApp, Telegram, or Discord
- Telegram: Click "Create Bot" link to BotFather, paste token
- Discord: Click "Add Bot" OAuth link, paste token
- WhatsApp: Enter phone number, complete verification flow
- Test message sent to confirm connectivity

**Step 5: Review & Launch**
- Summary of all settings
- "Launch My FarmClaw" button
- Provisioning begins (show progress: Creating instance → Installing skills → Connecting channel → Running health check → Live!)

---

## 5. Provisioning System

### 5.1 Provisioning API

When a customer completes onboarding, the dashboard calls the provisioning API which:

1. Generates customer-specific configuration files from templates
2. Creates a new container on Hetzner via Coolify's API
3. Injects configuration files into the container
4. Starts the OpenClaw gateway
5. Runs a health check
6. Updates instance status in Supabase

### 5.2 Container Configuration

**Base Docker Image: `farmclaw/openclaw:latest`**

Built from the official OpenClaw image with farm skills pre-installed:

```dockerfile
FROM node:22-slim

# Install OpenClaw globally
RUN npm install -g openclaw@latest

# Install Playwright + Chromium for browser skills
RUN npx playwright install --with-deps chromium

# Copy farm-specific skills into managed skills directory
COPY skills/ /home/node/.openclaw/skills/

# Copy base SOUL.md template
COPY templates/SOUL.md /home/node/.openclaw/SOUL.md

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set working directory
WORKDIR /home/node

# Expose gateway port
EXPOSE 18789

ENTRYPOINT ["/entrypoint.sh"]
```

**Entrypoint Script (`entrypoint.sh`):**

```bash
#!/bin/bash
set -e

# The provisioning system mounts customer config at /config
# Copy into OpenClaw's expected locations
cp /config/openclaw.json /home/node/.openclaw/openclaw.json
cp /config/SOUL.md /home/node/.openclaw/SOUL.md

# If customer has workspace skill overrides, copy those too
if [ -d "/config/workspace-skills" ]; then
  cp -r /config/workspace-skills/* /home/node/.openclaw/workspace/skills/
fi

# Start OpenClaw gateway
exec openclaw gateway --port 18789
```

### 5.3 Generated Configuration Files

**`openclaw.json` (templated per customer):**

```jsonc
{
  "name": "FarmClaw",
  "version": "1.0.0",

  // LLM Configuration — platform API key, proxied for metering
  "providers": {
    "anthropic": {
      "apiKey": "{{ANTHROPIC_API_KEY}}",
      "default": true
    }
  },
  "models": {
    "default": "claude-sonnet-4-5-20250929",
    "thinking": "claude-sonnet-4-5-20250929"
  },

  // Channel configuration (only the selected channel is enabled)
  "channels": {
    "telegram": {
      "enabled": {{TELEGRAM_ENABLED}},
      "token": "{{TELEGRAM_BOT_TOKEN}}"
    },
    "discord": {
      "enabled": {{DISCORD_ENABLED}},
      "token": "{{DISCORD_BOT_TOKEN}}",
      "dm": {
        "policy": "owner"
      }
    },
    "whatsapp": {
      "enabled": {{WHATSAPP_ENABLED}},
      "phoneNumberId": "{{WHATSAPP_PHONE_ID}}",
      "accessToken": "{{WHATSAPP_ACCESS_TOKEN}}"
    }
  },

  // Skills configuration
  "skills": {
    "install": {
      "nodeManager": "npm"
    },
    "entries": {
      "farm-grain-bids": {
        "enabled": true,
        "config": {
          "elevators": {{ELEVATOR_CONFIG_JSON}},
          "crops": {{CROPS_JSON}}
        }
      },
      "farm-weather": {
        "enabled": true,
        "config": {
          "latitude": {{WEATHER_LAT}},
          "longitude": {{WEATHER_LNG}},
          "location_name": "{{WEATHER_LOCATION}}",
          "timezone": "{{TIMEZONE}}"
        }
      }
    }
  },

  // Cron jobs for proactive alerts
  "cron": {
    "morning-weather": {
      "schedule": "0 6 * * *",
      "timezone": "{{TIMEZONE}}",
      "message": "Run the morning weather summary skill and send me today's weather briefing."
    },
    "daily-grain-bids": {
      "schedule": "0 9 * * 1-5",
      "timezone": "{{TIMEZONE}}",
      "message": "Run the grain bids skill and send me today's cash bids from my configured elevators."
    }
  },

  // Browser configuration for scraping skills
  "browser": {
    "enabled": true,
    "headless": true
  },

  // Memory settings
  "memory": {
    "enabled": true
  }
}
```

**`SOUL.md` (templated per customer):**

```markdown
# FarmClaw — Your Farm AI Assistant

You are FarmClaw, an AI assistant built specifically for {{FARM_NAME}}.
You help with daily farm operations, grain marketing decisions, and weather monitoring.

## About This Operation

- **Farm:** {{FARM_NAME}}
- **Location:** {{COUNTY}} County, {{STATE}}
- **Acres:** {{ACRES}}
- **Primary Crops:** {{CROPS_LIST}}
- **Preferred Elevators:** {{ELEVATOR_NAMES}}
- **Timezone:** {{TIMEZONE}}

## Your Personality

You are a knowledgeable, no-nonsense farm advisor. Think of yourself as a sharp
neighbor who happens to know everything about markets, weather, and ag programs.

- Be direct and practical. Farmers don't want fluff.
- Use common agricultural terminology naturally (basis, carry, prevent plant, etc.)
- When discussing prices, always include the date/time of the data.
- When discussing weather, use Fahrenheit and inches.
- Default to the farmer's local time zone for all times.
- If you don't know something, say so. Don't guess on prices or forecasts.

## Important Boundaries

- You are NOT a licensed financial advisor or commodity broker. Never recommend
  specific trades. You can present market data, basis levels, and historical
  comparisons — the farmer makes their own decisions.
- You are NOT an agronomist. You can relay weather data, GDD calculations, and
  general best practices, but recommend they consult their agronomist or
  extension agent for specific crop recommendations.
- Always cite your data source and timestamp when presenting market or weather data.

## Daily Routines

- **6:00 AM:** Send a morning weather briefing (today's forecast, wind, precipitation,
  any severe weather alerts for {{COUNTY}} County).
- **9:00 AM (Mon-Fri):** Send daily cash grain bids from configured elevators.

## How to Handle Common Requests

- "What's corn at?" → Run the grain bids skill for all configured elevators, show corn bids.
- "What's the weather?" → Run the weather skill for the configured location.
- "Spray window?" → Check wind speed, temperature, and humidity for the next 24-48 hours.
  Highlight windows where wind is <10mph, temp is 50-85°F, and no rain is forecast.
- "Basis?" → Show current cash bid minus nearby futures contract for each commodity.
- "Compare elevators" → Show side-by-side bids from all configured elevators.
```

---

## 6. Farm-Specific Skills (MVP)

### 6.1 Skill: `farm-grain-bids`

**Purpose:** Fetch and display current cash grain bids from the farmer's configured elevators.

**Trigger phrases:** "grain bids", "cash bids", "what's corn at", "what's beans at", "elevator prices", "check bids", "compare elevators"

**Directory structure:**
```
skills/farm-grain-bids/
├── SKILL.md
└── scripts/
    └── parse_bids.py  (optional post-processing helper)
```

**`SKILL.md`:**

```markdown
---
name: farm-grain-bids
description: Fetch current cash grain bids from configured grain elevators using the browser.
metadata:
  openclaw:
    requires:
      config:
        - browser.enabled
---

# Farm Grain Bids Skill

## Purpose
Retrieve and display current cash grain bids from the farmer's configured
grain elevators. Uses the browser tool to navigate to elevator websites
and extract posted bid information.

## Configuration
The farmer's elevator list is stored in the skill config. Each elevator entry contains:
- `name`: Display name of the elevator (e.g., "CHS Fargo")
- `url`: The URL of the elevator's cash bid page
- `crops`: Which commodities to look for at this elevator

Access the config via the environment or the skill config in openclaw.json.

## How to Fetch Bids

For each configured elevator:

1. Use the browser tool to navigate to the elevator's bid page URL.
2. Take an ARIA snapshot of the page to understand its structure.
3. Locate the cash bid table or listing. Look for:
   - Commodity names (Corn, Soybeans, Spring Wheat, Winter Wheat, Durum, etc.)
   - Bid prices (cash price per bushel)
   - Basis levels (if displayed — often shown as cents +/- relative to a futures contract)
   - Delivery period (spot, deferred, forward months)
   - Futures month reference (e.g., "Mar 26", "May 26")
4. Extract the relevant rows matching the farmer's configured crops.
5. If the page requires interaction (e.g., selecting a location dropdown), interact
   with the page elements as needed.

## Output Format

Present bids in a clean, scannable format:

```
📊 Cash Grain Bids — [Date, Time]

🌽 CORN
  CHS Fargo:      $4.52 (basis -35 Mar)
  ADM Casselton:  $4.48 (basis -39 Mar)

🫘 SOYBEANS
  CHS Fargo:      $10.15 (basis -55 Mar)
  ADM Casselton:  $10.22 (basis -48 Mar)
```

If a single elevator is requested, show all available commodities and delivery periods
for that elevator.

## Error Handling

- If an elevator website is unreachable or times out, report which elevator
  failed and show results from the others.
- If the page structure has changed and bids cannot be extracted, tell the farmer
  the elevator website may have been updated and suggest checking directly.
- Always include the timestamp of when the data was fetched.
- Note that cash bids are typically updated once daily in the morning.
  If checking in the evening, note that bids shown may be from that morning.

## Comparison Mode

When the farmer asks to compare elevators:
1. Fetch bids from all configured elevators.
2. Show a side-by-side comparison sorted by best price per commodity.
3. Highlight the best bid for each commodity.

## Important Notes

- Cash grain bids change daily. Always fetch fresh data — never use cached or
  remembered prices from previous conversations.
- Basis is expressed in cents per bushel relative to a futures contract month.
  Negative basis (e.g., -35) means 35 cents under the futures price.
- Some elevator sites show bids for multiple locations. Match on the location
  closest to the farmer's configured location if possible.
```

### 6.2 Skill: `farm-weather`

**Purpose:** Provide weather forecasts, current conditions, and agricultural weather intelligence for the farmer's location.

**Trigger phrases:** "weather", "forecast", "temperature", "rain", "wind", "spray window", "will it rain", "morning briefing", "GDD"

**Directory structure:**
```
skills/farm-weather/
├── SKILL.md
└── scripts/
    └── nws_api.sh  (helper script for NWS API calls)
```

**`SKILL.md`:**

```markdown
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
`User-Agent: FarmClaw/1.0 (contact@farmclaw.com)`

Use bash `curl` commands to call these endpoints. Parse the JSON response
to extract relevant fields.

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
```

### 6.3 Skill File Locations in Docker Image

```
/home/node/.openclaw/skills/
├── farm-grain-bids/
│   ├── SKILL.md
│   └── scripts/
│       └── parse_bids.py
├── farm-weather/
│   ├── SKILL.md
│   └── scripts/
│       └── nws_api.sh
```

These are placed in the managed skills directory so they're available to all instances but can be overridden by workspace-level skills if a specific customer needs customization.

---

## 7. API Usage Metering & Billing

### 7.1 Architecture

FarmClaw uses a single platform-owned Anthropic API key. All customer instances route through this key. To meter per-customer usage:

**Option A (Recommended for MVP): Log-based metering**
- Each OpenClaw instance logs API calls with token counts to a local file.
- A lightweight sidecar process (cron job on the orchestration server) collects
  these logs from each container every hour, parses token counts, and writes
  to the `api_usage` table in Supabase.
- Stripe metered billing is updated daily based on aggregated usage.

**Option B (Future): Proxy-based metering**
- Run an API proxy (e.g., LiteLLM or a custom Next.js API route) between
  customer instances and Anthropic.
- Each request includes a customer ID header.
- The proxy logs usage and forwards the request.
- More real-time but adds latency and a single point of failure.

### 7.2 Pricing Calculation

**Base subscription:** $40/month (covers infrastructure + base API allocation)

**API overage billing:**
- Include a base allocation of ~$15/month of API usage in the subscription
  (covers typical usage of ~35 messages/day at Sonnet pricing)
- Usage beyond the base allocation is billed at Anthropic's cost + 30% margin
- Metered via Stripe's usage-based billing

**Example cost breakdown for a typical customer:**
- Claude Sonnet 4.5: $3/M input tokens, $15/M output tokens
- Average message: ~2K input tokens, ~500 output tokens
- Average cost per message: ~$0.006 + ~$0.0075 = ~$0.0135
- 75 messages/day × 30 days = 2,250 messages/month
- Monthly API cost: ~$30.38
- Customer pays: $30.38 × 1.30 = ~$39.49/month in API usage
- Total customer bill: $40 (subscription) + $39.49 (API) = $79.49/month

Note: Browser-based skills use more tokens (ARIA snapshots are verbose).
A grain bid lookup might consume 5-10K tokens per elevator. Factor this
into the base allocation sizing.

### 7.3 Stripe Integration

```
Stripe Products:
├── FarmClaw Standard ($40/month, recurring)
│   └── Metered component: API Usage (price per 1K tokens, billed monthly)
```

Supabase webhook receives Stripe events for subscription lifecycle management.

---

## 8. Provisioning API Specification

### 8.1 Endpoints

All endpoints are Next.js API routes deployed on Vercel. Protected by Supabase Auth JWT.

**`POST /api/instances/provision`**
Triggered after onboarding completion. Creates and starts a new customer instance.

Request body:
```json
{
  "customer_id": "uuid",
  "farm_profile": { /* from onboarding */ },
  "channel": {
    "type": "telegram",
    "token": "bot_token_here"
  }
}
```

Flow:
1. Validate customer has active subscription
2. Generate `openclaw.json` from template + farm_profile data
3. Generate `SOUL.md` from template + farm_profile data
4. Call Coolify API to create new container from `farmclaw/openclaw:latest`
5. Mount generated config files as a volume
6. Attach persistent storage volume for OpenClaw memory/state
7. Start container
8. Poll health endpoint until ready (max 60 seconds)
9. Send test message to customer's channel
10. Update `instances` table with container details
11. Return success

**`POST /api/instances/{id}/restart`**
Restarts a customer instance (e.g., after config change).

**`POST /api/instances/{id}/stop`**
Stops a customer instance (e.g., subscription canceled).

**`GET /api/instances/{id}/status`**
Returns instance health status, uptime, last message timestamp.

**`PUT /api/instances/{id}/config`**
Updates instance configuration (elevator list, channel, etc.).
Regenerates config files and restarts the container.

**`POST /api/instances/{id}/update-skills`**
Pulls latest farm skills Docker image and restarts with new skills.
Used for global skill updates across all customers.

### 8.2 Coolify API Integration

Coolify exposes a REST API for managing applications. Key operations:

```
POST /api/v1/applications — Create new application (container)
POST /api/v1/applications/{uuid}/start — Start
POST /api/v1/applications/{uuid}/stop — Stop
POST /api/v1/applications/{uuid}/restart — Restart
GET  /api/v1/applications/{uuid} — Status
DELETE /api/v1/applications/{uuid} — Destroy
```

Each customer instance is a Coolify "application" running the `farmclaw/openclaw` Docker image with environment-specific config mounted.

---

## 9. Monitoring & Operations

### 9.1 Health Checks

Each OpenClaw instance exposes a health endpoint at `http://localhost:18789/health` (internal only). The orchestration server runs a cron job every 5 minutes that:

1. Queries all active instances from Supabase
2. Hits each instance's health endpoint
3. Updates `last_health_check` in the database
4. If an instance is unhealthy for >15 minutes, auto-restart it
5. If restart fails, alert via email/Telegram to admin

### 9.2 Uptime Kuma

Self-hosted on the Coolify orchestration server. Monitors:
- Dashboard (Vercel) uptime
- Supabase API availability
- Each customer instance health endpoint
- Coolify API availability
- Anthropic API availability

### 9.3 Logging

- Customer instance logs: Stored in each container's persistent volume + streamed to Coolify's log viewer
- Provisioning logs: Vercel function logs
- API usage logs: Written to Supabase `api_usage` table

### 9.4 Global Skill Updates

When a farm skill is updated:

1. Push updated skill files to the `farmclaw/openclaw` Docker image repo
2. Rebuild and push new image tag
3. Trigger rolling restart of all customer instances via the admin API
4. Each container pulls the new image on restart
5. OpenClaw detects new skills on session start (no mid-session disruption)

Admin dashboard page: `/admin/skills-update` — one-click deploy of skill updates to all instances.

---

## 10. MVP Scope & Build Order

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Hetzner account and provision orchestration server
- [ ] Install and configure Coolify on orchestration server
- [ ] Build the `farmclaw/openclaw` Docker image with Playwright + Chromium
- [ ] Write `farm-grain-bids` SKILL.md and test locally
- [ ] Write `farm-weather` SKILL.md and test locally
- [ ] Write the SOUL.md template and test with various farm profiles
- [ ] Test full OpenClaw instance locally with Telegram channel

### Phase 2: Dashboard & Provisioning (Week 3-4)
- [ ] Initialize Next.js project with Supabase auth
- [ ] Build database schema (run migrations)
- [ ] Build onboarding wizard (5-step flow)
- [ ] Build provisioning API (Coolify integration)
- [ ] Build config file templating system (openclaw.json + SOUL.md generators)
- [ ] Build instance management API (start, stop, restart, status)
- [ ] Set up Stripe subscription + metered billing
- [ ] Build dashboard home page (instance status, quick stats)
- [ ] Build settings pages (farm profile, channels, billing)

### Phase 3: Metering & Polish (Week 5-6)
- [ ] Build API usage collection system (log parsing from containers)
- [ ] Build usage dashboard page
- [ ] Connect metered billing to Stripe
- [ ] Set up Uptime Kuma monitoring
- [ ] Build health check automation (auto-restart unhealthy instances)
- [ ] Build admin panel for global skill updates
- [ ] End-to-end testing with 3-5 test farms across different states
- [ ] Landing page

### Phase 4: Beta Launch (Week 7-8)
- [ ] Invite 20-30 beta users from AI on Your Farm / Fullstack Ag
- [ ] Monitor and iterate on skill quality (grain bids accuracy, weather formatting)
- [ ] Collect feedback on SOUL.md persona and response quality
- [ ] Tune cron job timing based on user feedback
- [ ] Fix edge cases (elevator sites that don't work, weather API failures)
- [ ] Prepare for wider launch

---

## 11. Future Skills Roadmap (Post-MVP)

These are not in scope for the MVP build but inform architecture decisions:

- **Futures prices skill** — Pull CME futures via Barchart API (requires API key)
- **Crop insurance deadlines** — USDA RMA calendar integration with proactive reminders
- **FSA program tracker** — Deadlines, signup windows, program details
- **Equipment maintenance** — Scheduled reminders based on hours/calendar
- **Basis history tracker** — Record daily basis levels over time, show trends
- **Market commentary** — Summarize daily grain market commentary from trade publications
- **Satellite imagery** — NDVI / crop health from Sentinel-2 (browser-based)
- **Livestock skills** — Cattle market reports, feed rations, herd management

---

## 12. Technical Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| One container per customer vs. multi-tenant | One container per customer | OpenClaw is designed as single-user. Fighting this creates complexity. Isolation is cleaner. |
| Hetzner vs. AWS/GCP | Hetzner | 4-5x cheaper for always-on VMs. No need for AWS services. |
| Coolify vs. custom orchestration | Coolify | Free, self-hosted, provides UI + API + rolling deploys. Avoids building our own container manager. |
| Supabase vs. PlanetScale vs. raw Postgres | Supabase | Auth + Postgres + RLS + real-time in one. Already familiar with it. Free tier for MVP. |
| API metering: log-based vs. proxy | Log-based for MVP | Simpler, no added latency, no SPOF. Proxy can come later if real-time metering is needed. |
| LLM model: Sonnet vs. Opus vs. Haiku | Sonnet 4.5 default | Best cost/performance balance for tool use and browser skills. Opus is overkill, Haiku may struggle with complex scraping. |
| Channel priority | Telegram first, WhatsApp second, Discord third | Telegram is zero-friction (BotFather). WhatsApp has highest farmer adoption but more complex setup. Discord is niche. |
| Skills: API-first vs. browser-first | Browser-first for MVP | Faster to ship. Grain elevator sites don't have APIs. Weather uses NWS API where available, browser as fallback. |

---

## 13. Open Questions

1. **WhatsApp Business API routing:** Do we get one business number and route by customer phone, or help each customer register their own? Research Meta's Cloud API pricing and multi-number options.

2. **API key isolation:** Using a single platform API key means one customer's abuse could rate-limit everyone. Consider per-customer API keys managed by the platform, or rate limiting at the container level.

3. **Elevator URL maintenance:** Elevator websites change. Who maintains the URL database? Consider building a shared elevator directory that all customers benefit from, with an admin tool for URL updates.

4. **Offline/degraded mode:** If the Anthropic API is down, should the instance queue messages and retry, or immediately notify the farmer? OpenClaw may handle this natively.

5. **Data retention:** How long do we keep conversation history and API usage logs? Farmers may want to reference old price lookups. Define retention policy.
