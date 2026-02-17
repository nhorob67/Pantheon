interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export async function geocodeLocation(
  query: string
): Promise<GeocodeResult | null> {
  // Use Census Bureau geocoder (free, no API key)
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const match = data?.result?.addressMatches?.[0];

    if (match) {
      return {
        lat: parseFloat(match.coordinates.y),
        lng: parseFloat(match.coordinates.x),
        display_name: match.matchedAddress,
      };
    }
    return null;
  } catch {
    return null;
  }
}
