import type { SkillTemplate } from "@/types/custom-skill";

export const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    id: "crop-scouting",
    name: "Crop Scouting Report",
    category: "crop-management",
    description: "Structured pest, disease, and growth-stage reporting by field",
    icon: "Search",
    prompt_hint: "Include growth stage tracking, pest identification guidance, and structured reporting format",
    starter_skill_md: `---
name: custom-crop-scouting
description: Structured crop scouting reports with pest and growth stage tracking.
user-invocable: true
---

# Crop Scouting Report

## Purpose
Help the farmer create structured crop scouting reports for their fields.
Track growth stages, pest pressure, disease observations, and weed issues
throughout the growing season.

## Report Format

When the farmer wants to log a scouting report, collect:
1. **Field name** — which field was scouted
2. **Date** — when the scouting occurred (default to today)
3. **Crop & Growth Stage** — e.g., Corn V6, Soybeans R1
4. **Pest observations** — insects found, estimated pressure (low/moderate/high)
5. **Disease observations** — any disease symptoms noted
6. **Weed pressure** — species and density
7. **General notes** — stand count, moisture, damage, etc.

Format the report as:

\`\`\`
🔍 SCOUTING REPORT — {{field_name}}
Date: {{date}}
Crop: {{crop}} | Stage: {{growth_stage}}

PEST PRESSURE: {{level}}
  {{pest_observations}}

DISEASE: {{level}}
  {{disease_observations}}

WEED PRESSURE: {{level}}
  {{weed_observations}}

NOTES:
  {{general_notes}}
\`\`\`

## Growth Stage Reference

### Corn
- VE: Emergence
- V1-V6: Vegetative (leaf collar count)
- VT: Tasseling
- R1-R6: Reproductive (silking through maturity)

### Soybeans
- VE-VC: Emergence to cotyledon
- V1-V6: Vegetative (node count)
- R1-R8: Reproductive (flowering through maturity)

## When Asked for a Summary
Provide a season summary across all scouting reports logged, noting trends in pest pressure and key observations by field.
`,
  },
  {
    id: "input-cost-calculator",
    name: "Input Cost Calculator",
    category: "financial",
    description: "Calculate seed, fertilizer, and chemical costs per acre",
    icon: "Calculator",
    prompt_hint: "Include per-acre cost breakdown, comparison across fields, and total operation cost summary",
    starter_skill_md: `---
name: custom-input-cost-calculator
description: Calculate and track seed, fertilizer, and chemical input costs per acre.
user-invocable: true
---

# Input Cost Calculator

## Purpose
Help the farmer track and calculate input costs for each field and crop.
Break down costs per acre for seed, fertilizer, chemicals, and other inputs.

## Input Categories

### Seed
- Crop type and variety
- Seeding rate (seeds/acre or lbs/acre)
- Cost per bag/unit
- Acres applied

### Fertilizer
- Product name (e.g., 28-0-0 UAN, 11-52-0 MAP, 0-0-60 Potash)
- Rate (lbs/acre or gallons/acre)
- Cost per ton or per gallon
- Acres applied

### Chemicals
- Product name
- Rate (oz/acre, pt/acre, etc.)
- Cost per jug/container and container size
- Acres applied

### Other
- Crop insurance premium per acre
- Custom hire / application cost per acre
- Any other per-acre costs

## Cost Summary Format

\`\`\`
💰 INPUT COSTS — {{field_name}} ({{acres}} acres)
Crop: {{crop}}

SEED:       \${{seed_per_acre}}/acre    Total: \${{seed_total}}
FERTILIZER: \${{fert_per_acre}}/acre    Total: \${{fert_total}}
CHEMICALS:  \${{chem_per_acre}}/acre    Total: \${{chem_total}}
OTHER:      \${{other_per_acre}}/acre   Total: \${{other_total}}
─────────────────────────────────────────
TOTAL:      \${{total_per_acre}}/acre   Total: \${{grand_total}}
\`\`\`

## Breakeven Calculation
When the farmer provides expected yield and a target price, calculate the breakeven price per bushel:
- Breakeven = Total cost per acre / Expected yield per acre
`,
  },
  {
    id: "harvest-yield-tracker",
    name: "Harvest Yield Tracker",
    category: "crop-management",
    description: "Log and analyze harvest yields by field with season summaries",
    icon: "BarChart3",
    prompt_hint: "Include per-field yield logging, moisture adjustments, and season comparison",
    starter_skill_md: `---
name: custom-harvest-yield-tracker
description: Log harvest yields by field and analyze performance across the season.
user-invocable: true
---

# Harvest Yield Tracker

## Purpose
Help the farmer log harvest data field-by-field and provide yield analysis,
moisture-adjusted yields, and season summaries.

## Data Collection

When the farmer reports harvest data, collect:
1. **Field name**
2. **Crop**
3. **Date harvested**
4. **Wet yield** (bu/acre from combine monitor)
5. **Moisture %** at harvest
6. **Acres harvested**
7. **Notes** — any issues, hybrid/variety if known

## Moisture Adjustment

Adjust yields to standard moisture:
- Corn: 15.0%
- Soybeans: 13.0%
- Wheat: 13.5%
- Barley: 14.5%
- Sunflowers: 10.0%

Formula: Adjusted yield = Wet yield × (100 - Actual moisture) / (100 - Standard moisture)

## Harvest Log Format

\`\`\`
🌾 HARVEST LOG — {{field_name}}
Date: {{date}} | Crop: {{crop}}
Acres: {{acres}}
Wet Yield: {{wet_yield}} bu/acre @ {{moisture}}%
Adjusted Yield: {{adjusted_yield}} bu/acre @ {{standard_moisture}}%
Total Bushels: {{total_bushels}}
{{notes}}
\`\`\`

## Season Summary

When asked for a harvest summary, provide:
- Total acres harvested by crop
- Average adjusted yield by crop
- Best and worst performing fields
- Total bushels by crop
- Comparison to county/state averages if known
`,
  },
  {
    id: "equipment-maintenance",
    name: "Equipment Maintenance Log",
    category: "equipment",
    description: "Track service records, hours, and maintenance schedules",
    icon: "Wrench",
    prompt_hint: "Include hour tracking, service intervals, and upcoming maintenance alerts",
    starter_skill_md: `---
name: custom-equipment-maintenance
description: Track equipment service records, hours, and upcoming maintenance schedules.
user-invocable: true
---

# Equipment Maintenance Log

## Purpose
Help the farmer track equipment maintenance, service records, and hours.
Alert when service intervals are approaching.

## Equipment Registration

When the farmer adds a piece of equipment, collect:
1. **Type** — Tractor, Combine, Sprayer, Planter, Drill, Truck, etc.
2. **Make & Model** — e.g., John Deere 8R 370
3. **Year**
4. **Serial number** (optional)
5. **Current hours** or miles

## Service Log Entry

When logging a service, collect:
1. **Equipment** (by name/type)
2. **Date**
3. **Hours/miles at service**
4. **Service type** — Oil change, Filters, Greasing, Repair, Annual, etc.
5. **Parts used** (optional)
6. **Cost** (optional)
7. **Notes**

## Service Format

\`\`\`
🔧 SERVICE LOG — {{equipment_name}}
Date: {{date}} | Hours: {{hours}}
Service: {{service_type}}
Parts: {{parts}}
Cost: \${{cost}}
Notes: {{notes}}
\`\`\`

## Standard Intervals
- **Engine oil & filter:** Every 250-500 hours
- **Hydraulic filter:** Every 500-1000 hours
- **Air filter:** Every 500 hours or as needed
- **Fuel filter:** Every 500 hours
- **Transmission/axle fluid:** Every 1000-2000 hours
- **Grease points:** Every 10-50 hours depending on component

## Upcoming Maintenance

When asked, check equipment hours against last service and recommend upcoming maintenance based on standard intervals.
`,
  },
  {
    id: "livestock-feed-ration",
    name: "Livestock Feed Ration",
    category: "livestock",
    description: "Feed formulation and daily cost per head calculations",
    icon: "Beef",
    prompt_hint: "Include ration balancing, cost per head per day, and ingredient substitution suggestions",
    starter_skill_md: `---
name: custom-livestock-feed-ration
description: Formulate feed rations and calculate daily cost per head.
user-invocable: true
---

# Livestock Feed Ration

## Purpose
Help the farmer formulate balanced feed rations and calculate
daily feed costs per head for cattle, hogs, or other livestock.

## Ration Entry

When the farmer wants to build or log a ration, collect:
1. **Animal class** — e.g., Finishing steers, Bred cows, Feeder calves
2. **Head count**
3. **Target weight / stage**
4. **Ingredients** — each with:
   - Feed name (corn, silage, hay, DDGs, supplement, etc.)
   - Lbs per head per day (as-fed)
   - Cost per ton (as-fed)

## Ration Summary Format

\`\`\`
🐄 FEED RATION — {{animal_class}} ({{head_count}} head)

Ingredient          lbs/hd/day   $/ton    $/hd/day
─────────────────────────────────────────────────
{{ingredient_rows}}
─────────────────────────────────────────────────
TOTAL               {{total_lbs}}          \${{total_per_head}}

Daily cost (all head): \${{daily_total}}
Monthly estimate:      \${{monthly_total}}
\`\`\`

## Nutritional Guidelines (Beef Cattle)
- **Finishing steers (1100-1300 lb target):** ~2.5-3% body weight DMI, 12-13% CP
- **Bred cows (mid-gestation):** ~2% BW DMI, 7-8% CP
- **Growing calves:** ~2.5-3% BW DMI, 13-14% CP

## When Adjusting Rations
If the farmer wants to substitute an ingredient, calculate the cost difference per head per day and note any nutritional trade-offs.
`,
  },
  {
    id: "fsa-crop-insurance",
    name: "FSA / Crop Insurance Reporter",
    category: "compliance",
    description: "Format acreage reports and insurance claim data for submission",
    icon: "FileText",
    prompt_hint: "Include acreage report formatting, claim documentation, and deadline reminders",
    starter_skill_md: `---
name: custom-fsa-crop-insurance
description: Format acreage reports, crop insurance data, and compliance documentation.
user-invocable: true
---

# FSA / Crop Insurance Reporter

## Purpose
Help the farmer organize and format data for FSA acreage reports,
crop insurance claims, and compliance documentation.

## Acreage Report

Collect per-field data for the FSA-578 acreage report:
1. **Farm/Tract/Field number** (FSA identifiers)
2. **Crop planted**
3. **Intended use** — Grain, Silage, Cover Crop, Hay, etc.
4. **Acres**
5. **Planting date**
6. **Share** — percent the farmer owns/operates
7. **Practice** — Irrigated or Non-irrigated

## Acreage Report Format

\`\`\`
📋 ACREAGE REPORT SUMMARY
Reporting Year: {{year}}

Farm   Tract  Field  Crop          Acres   Planted    Use      Practice
──────────────────────────────────────────────────────────────────────
{{field_rows}}
──────────────────────────────────────────────────────────────────────
TOTALS:                            {{total_acres}}
\`\`\`

## Key Deadlines (Upper Midwest)
- **Acreage Report:** July 15 (most crops)
- **Small Grains Acreage:** July 15
- **Fall-Seeded Crops:** November 15
- **NAP Coverage Application:** Before planting
- **Production Report:** Due within 15 days of completing harvest

## Insurance Claim Data
When documenting a potential claim, collect:
- Policy number and crop
- Field(s) affected
- Date of loss
- Cause of loss (drought, hail, excess moisture, frost, etc.)
- Estimated damage percentage
- Photos if available

Remind the farmer to contact their crop insurance agent within 72 hours of discovering damage.
`,
  },
  {
    id: "field-notes",
    name: "Field Notes",
    category: "crop-management",
    description: "Structured field observations organized by field and date",
    icon: "NotebookPen",
    prompt_hint: "Include structured note-taking, field tagging, and seasonal timeline views",
    starter_skill_md: `---
name: custom-field-notes
description: Record structured field observations organized by field, date, and category.
user-invocable: true
---

# Field Notes

## Purpose
Help the farmer keep organized field notes throughout the season.
Notes are tagged by field, date, and category for easy recall.

## Note Categories
- **Planting** — seeding rates, populations, dates, varieties
- **Application** — spraying, fertilizing, side-dressing
- **Observation** — stand counts, emergence, crop condition
- **Weather event** — storm damage, flooding, drought stress
- **Harvest** — yield observations, combine settings, issues
- **General** — tile work, drainage, soil sampling, landlord notes

## Note Entry

When the farmer shares a field note, record:
1. **Field name**
2. **Date** (default today)
3. **Category**
4. **Note content**

## Note Format

\`\`\`
📝 FIELD NOTE — {{field_name}}
Date: {{date}} | Category: {{category}}

{{note_content}}
\`\`\`

## Recall

When the farmer asks about a field or topic:
- Search previous notes by field name
- Filter by category or date range
- Show chronological timeline of activity for a field

## Season Timeline

When asked for a field's season summary, present all notes for that field in chronological order, grouped by month.
`,
  },
  {
    id: "market-alert",
    name: "Market Alert Watcher",
    category: "financial",
    description: "Custom price alerts and market threshold notifications",
    icon: "Bell",
    prompt_hint: "Include price threshold alerts, basis monitoring, and daily market summary",
    starter_skill_md: `---
name: custom-market-alert
description: Set custom price alerts and monitor market thresholds for grain commodities.
user-invocable: true
---

# Market Alert Watcher

## Purpose
Help the farmer set and manage price alerts for grain commodities.
Notify when prices cross configured thresholds.

## Alert Setup

When the farmer wants to set an alert, collect:
1. **Commodity** — Corn, Soybeans, Wheat, etc.
2. **Direction** — Above or Below
3. **Target price** — per bushel
4. **Alert type** — Futures, Cash bid (specify elevator), or Basis
5. **Notes** — why this price matters (e.g., "covers input costs", "target to sell 25%")

## Alert Format

\`\`\`
🔔 PRICE ALERT SET
{{commodity}} {{direction}} \${{target_price}}/bu
Type: {{alert_type}}
Notes: {{notes}}
\`\`\`

## Alert Triggered

\`\`\`
🚨 PRICE ALERT TRIGGERED
{{commodity}} is now \${{current_price}}/bu ({{direction}} your target of \${{target_price}})
Change: {{change_amount}} ({{change_percent}}%)
Your note: "{{notes}}"
\`\`\`

## Active Alerts Summary

When asked to show active alerts, list all configured alerts with current prices and distance from target.

## Daily Market Summary

When asked or on schedule, provide a summary of watched commodities with current prices and distance from any alert targets.
`,
  },
];

export function getTemplateById(id: string): SkillTemplate | undefined {
  return SKILL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): SkillTemplate[] {
  return SKILL_TEMPLATES.filter((t) => t.category === category);
}
