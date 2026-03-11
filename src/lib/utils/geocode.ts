const ZIP_RE = /^\d{5}(-\d{4})?$/;
const POSTAL_RE = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

export function isZipOrPostalCode(query: string): boolean {
  const q = query.trim();
  return ZIP_RE.test(q) || POSTAL_RE.test(q);
}

interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
}

export async function geocodeLocation(
  query: string,
  countryCode: string = "us"
): Promise<GeocodeResult | null> {
  const cc = countryCode.toLowerCase() === "ca" ? "ca" : "us";
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=${cc}&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Pantheon/1.0 (https://pantheon.app)",
        Accept: "application/json",
      },
    });
    const data = await res.json();
    const match = data?.[0];

    if (match) {
      return {
        lat: parseFloat(match.lat),
        lng: parseFloat(match.lon),
        display_name: match.display_name,
      };
    }
    return null;
  } catch {
    return null;
  }
}
