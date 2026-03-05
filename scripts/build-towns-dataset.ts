/**
 * Downloads GeoNames US.txt + CA.txt, filters to populated places,
 * and outputs public/data/towns-us-ca.json as compact arrays.
 *
 * Run: npx tsx scripts/build-towns-dataset.ts
 *
 * GeoNames data is CC BY 4.0: https://www.geonames.org/
 */

import { mkdirSync, unlinkSync, createReadStream, statSync } from "fs";
import { writeFile } from "fs/promises";
import { createInterface } from "readline";
import { join } from "path";
import { execFileSync } from "child_process";

const GEONAMES_BASE = "https://download.geonames.org/export/dump";
const COUNTRIES = ["US", "CA"] as const;

// GeoNames feature codes for populated places
const PPL_CODES = new Set([
  "PPL",
  "PPLA",
  "PPLA2",
  "PPLA3",
  "PPLA4",
  "PPLA5",
  "PPLC",
  "PPLF",
  "PPLG",
  "PPLL",
  "PPLQ",
  "PPLR",
  "PPLS",
  "PPLX",
]);

// GeoNames uses numeric admin1 codes for Canada — map to standard province codes
const CA_ADMIN1_TO_PROVINCE: Record<string, string> = {
  "01": "AB",
  "02": "BC",
  "03": "MB",
  "04": "NB",
  "05": "NL",
  "07": "NS",
  "08": "ON",
  "09": "PE",
  "10": "QC",
  "11": "SK",
  "12": "YT",
  "13": "NT",
  "14": "NU",
};

// Output format: [name, stateCode, lat, lng, population]
type TownEntry = [string, string, number, number, number];

interface TownsByCountry {
  US: TownEntry[];
  CA: TownEntry[];
}

async function downloadAndExtract(country: string): Promise<string> {
  const zipUrl = `${GEONAMES_BASE}/${country}.zip`;
  const tmpZip = join("/tmp", `${country}-geonames.zip`);

  console.log(`Downloading ${zipUrl}...`);
  const res = await fetch(zipUrl);
  if (!res.ok) throw new Error(`Failed to download ${zipUrl}: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(tmpZip, buffer);

  const tmpDir = join("/tmp", `geonames-${country}`);
  mkdirSync(tmpDir, { recursive: true });

  execFileSync("unzip", ["-o", tmpZip, "-d", tmpDir], { stdio: "pipe" });

  unlinkSync(tmpZip);
  return join(tmpDir, `${country}.txt`);
}

function parseTowns(filePath: string, country: string): Promise<TownEntry[]> {
  return new Promise((resolve, reject) => {
    const towns: TownEntry[] = [];
    const seen = new Set<string>();

    const rl = createInterface({
      input: createReadStream(filePath, { encoding: "utf-8" }),
      crlfDelay: Infinity,
    });

    rl.on("line", (line: string) => {
      const cols = line.split("\t");
      // GeoNames TSV columns:
      // 0: geonameid, 1: name, 2: asciiname, 3: alternatenames,
      // 4: latitude, 5: longitude, 6: feature class, 7: feature code,
      // 8: country code, 9: cc2, 10: admin1 code, 11: admin2 code,
      // 12: admin3, 13: admin4, 14: population, ...

      const featureCode = cols[7];
      if (!PPL_CODES.has(featureCode)) return;

      const name = cols[1];
      let stateCode = cols[10]; // admin1 = state/province code

      // Convert Canadian numeric admin1 to province code
      if (country === "CA") {
        stateCode = CA_ADMIN1_TO_PROVINCE[stateCode] ?? stateCode;
      }
      const lat = parseFloat(cols[4]);
      const lng = parseFloat(cols[5]);
      const population = parseInt(cols[14], 10) || 0;

      if (!name || !stateCode) return;

      // For generic PPL, require population > 0 to filter unnamed/tiny places
      if (featureCode === "PPL" && population === 0) return;

      // Deduplicate by name+state
      const key = `${name}|${stateCode}`;
      if (seen.has(key)) return;
      seen.add(key);

      towns.push([
        name,
        stateCode,
        Math.round(lat * 10000) / 10000,
        Math.round(lng * 10000) / 10000,
        population,
      ]);
    });

    rl.on("close", () => resolve(towns));
    rl.on("error", reject);
  });
}

async function main() {
  const result: TownsByCountry = { US: [], CA: [] };

  for (const country of COUNTRIES) {
    const filePath = await downloadAndExtract(country);
    console.log(`Parsing ${country}...`);
    const towns = await parseTowns(filePath, country);
    // Sort by population descending for better default ordering
    towns.sort((a, b) => b[4] - a[4]);
    result[country] = towns;
    console.log(`  ${country}: ${towns.length} populated places`);
  }

  const outDir = join(process.cwd(), "public", "data");
  mkdirSync(outDir, { recursive: true });

  const outPath = join(outDir, "towns-us-ca.json");
  await writeFile(outPath, JSON.stringify(result));

  const sizeKB = Math.round(statSync(outPath).size / 1024);
  console.log(`\nWrote ${outPath} (${sizeKB} KB)`);

  // Spot-check small towns
  const checkTowns = ["Binford", "Hatton", "Casselton"];
  for (const t of checkTowns) {
    const found = result.US.find((e) => e[0] === t);
    console.log(
      `  ${t}: ${found ? `${found[0]}, ${found[1]} (pop ${found[4]})` : "NOT FOUND"}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
