import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

type TownEntry = [string, string, number, number, number];
// [name, stateCode, lat, lng, population]

interface TownsData {
  US: TownEntry[];
  CA: TownEntry[];
}

let cache: TownsData | null = null;

function loadTowns(): TownsData {
  if (cache) return cache;
  const filePath = join(process.cwd(), "public", "data", "towns-us-ca.json");
  cache = JSON.parse(readFileSync(filePath, "utf-8"));
  return cache!;
}

const ZIP_RE = /^\d{5}(-\d{4})?$/;
const POSTAL_RE = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

function isZipOrPostalCode(q: string): boolean {
  return ZIP_RE.test(q) || POSTAL_RE.test(q);
}

interface ScoredTown {
  name: string;
  state: string;
  lat: number;
  lng: number;
  population: number;
  score: number;
}

function searchTowns(
  towns: TownEntry[],
  query: string,
  state?: string
): ScoredTown[] {
  const q = query.toLowerCase();
  const results: ScoredTown[] = [];

  for (const [name, stateCode, lat, lng, pop] of towns) {
    const nameLower = name.toLowerCase();

    let score = 0;
    if (nameLower === q) {
      score = 20;
    } else if (nameLower.startsWith(q)) {
      score = 10;
    } else if (nameLower.includes(q)) {
      score = 3;
    } else {
      continue;
    }

    if (state && stateCode === state) {
      score += 5;
    }

    // Tie-break by population (log scale)
    score += pop > 0 ? Math.log10(pop) : 0;

    results.push({ name, state: stateCode, lat, lng, population: pop, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 8);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const country = (searchParams.get("country") ?? "US").toUpperCase();
  const state = searchParams.get("state") ?? undefined;

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (isZipOrPostalCode(q)) {
    return NextResponse.json({ results: [], fallback: "nominatim" });
  }

  try {
    const data = loadTowns();
    const towns = country === "CA" ? data.CA : data.US;
    const results = searchTowns(towns, q, state);

    return NextResponse.json({
      results: results.map((r) => ({
        name: r.name,
        state: r.state,
        lat: r.lat,
        lng: r.lng,
        population: r.population,
      })),
    });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
