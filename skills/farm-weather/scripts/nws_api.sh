#!/bin/bash
# NWS API helper for FarmClaw weather skill
# Usage: nws_api.sh <lat> <lng> [forecast|hourly|alerts]

set -e

LAT="$1"
LNG="$2"
TYPE="${3:-forecast}"
USER_AGENT="FarmClaw/1.0 (contact@farmclaw.com)"

# Get grid point
POINT_URL="https://api.weather.gov/points/${LAT},${LNG}"
POINT_DATA=$(curl -sf -H "User-Agent: ${USER_AGENT}" "$POINT_URL")

case "$TYPE" in
  forecast)
    FORECAST_URL=$(echo "$POINT_DATA" | jq -r '.properties.forecast')
    curl -sf -H "User-Agent: ${USER_AGENT}" "$FORECAST_URL" | jq '.properties.periods'
    ;;
  hourly)
    HOURLY_URL=$(echo "$POINT_DATA" | jq -r '.properties.forecastHourly')
    curl -sf -H "User-Agent: ${USER_AGENT}" "$HOURLY_URL" | jq '.properties.periods'
    ;;
  alerts)
    ALERTS_URL="https://api.weather.gov/alerts/active?point=${LAT},${LNG}"
    curl -sf -H "User-Agent: ${USER_AGENT}" "$ALERTS_URL" | jq '.features'
    ;;
  *)
    echo "Usage: nws_api.sh <lat> <lng> [forecast|hourly|alerts]"
    exit 1
    ;;
esac
