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

## Cached Bids

Before scraping elevator websites, check for recent cached bids using the `tenant_grain_bid_query` tool. This can provide faster responses when bids have been recently fetched by the background scraper.

- Use `tenant_grain_bid_query` with `max_age_hours: 4` for reasonably fresh data
- If cached bids are available and recent, present them to the farmer
- If cached bids are stale or unavailable, fall back to live scraping via the browser
- Always note the data source (cached vs live) and timestamp when presenting bids

## Important Notes

- Cash grain bids change daily. Always fetch fresh data — never use cached or
  remembered prices from previous conversations.
- Basis is expressed in cents per bushel relative to a futures contract month.
  Negative basis (e.g., -35) means 35 cents under the futures price.
- Some elevator sites show bids for multiple locations. Match on the location
  closest to the farmer's configured location if possible.
