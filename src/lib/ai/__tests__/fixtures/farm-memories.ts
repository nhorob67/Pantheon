/**
 * 30 realistic farm memory fixtures for quality and adversarial testing.
 * Used by memory-quality.test.ts, memory-adversarial.test.ts, and memory-release-gate.test.ts.
 */

export interface FarmMemoryFixture {
  id: string;
  content: string;
  memory_type: "fact" | "preference" | "commitment" | "outcome";
  memory_tier: "working" | "episodic" | "knowledge";
  confidence: number;
  created_at: string;
  is_tombstoned: boolean;
  superseded_by: string | null;
  /** For test assertions: tags describing what queries should match this */
  tags: string[];
}

const NOW = new Date("2026-02-24T12:00:00Z");
function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

export const FARM_MEMORIES: FarmMemoryFixture[] = [
  // --- Corn facts ---
  {
    id: "mem-001",
    content: "Farm has 2400 acres of corn near Minot, ND",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.95,
    created_at: daysAgo(30),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["corn", "acreage", "location"],
  },
  {
    id: "mem-002",
    content: "Always delivers corn to CHS Minot elevator",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: daysAgo(20),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["corn", "delivery", "elevator"],
  },
  {
    id: "mem-003",
    content: "Corn yield target is 180 bu/acre for 2026 season",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.8,
    created_at: daysAgo(10),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["corn", "yield"],
  },

  // --- Soybean facts ---
  {
    id: "mem-004",
    content: "Farm has 1200 acres of soybeans planted in the south section",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.92,
    created_at: daysAgo(25),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["soybeans", "acreage"],
  },
  {
    id: "mem-005",
    content: "Soybeans delivered to ADM Velva in 2025",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.85,
    created_at: daysAgo(180),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["soybeans", "delivery", "elevator"],
  },

  // --- Wheat facts ---
  {
    id: "mem-006",
    content: "Spring wheat acreage is 800 acres, planted mid-April",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.88,
    created_at: daysAgo(15),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["wheat", "acreage", "planting"],
  },

  // --- Preferences ---
  {
    id: "mem-007",
    content: "Prefers morning weather briefings at 6am Central time",
    memory_type: "preference",
    memory_tier: "knowledge",
    confidence: 0.95,
    created_at: daysAgo(45),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "weather", "schedule"],
  },
  {
    id: "mem-008",
    content: "Likes grain bid updates summarized by crop, not by elevator",
    memory_type: "preference",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: daysAgo(40),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "grain-bids"],
  },
  {
    id: "mem-009",
    content: "Does not want to hear about futures prices, only cash bids",
    memory_type: "preference",
    memory_tier: "knowledge",
    confidence: 0.92,
    created_at: daysAgo(35),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "grain-bids"],
  },

  // --- Commitments ---
  {
    id: "mem-010",
    content: "Plans to deliver 500 bushels of corn to CHS Minot on Thursday",
    memory_type: "commitment",
    memory_tier: "episodic",
    confidence: 0.85,
    created_at: daysAgo(2),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["commitment", "corn", "delivery"],
  },
  {
    id: "mem-011",
    content: "Committed to spraying north quarter by end of week",
    memory_type: "commitment",
    memory_tier: "episodic",
    confidence: 0.8,
    created_at: daysAgo(3),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["commitment", "spraying"],
  },

  // --- Outcomes ---
  {
    id: "mem-012",
    content: "Delivered 12,000 bushels of corn to CHS on Feb 15",
    memory_type: "outcome",
    memory_tier: "working",
    confidence: 0.95,
    created_at: daysAgo(9),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["outcome", "corn", "delivery"],
  },

  // --- Superseded memories ---
  {
    id: "mem-013",
    content: "Corn basis at CHS Minot is -25 cents",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.7,
    created_at: daysAgo(60),
    is_tombstoned: true,
    superseded_by: "mem-014",
    tags: ["corn", "basis", "superseded"],
  },
  {
    id: "mem-014",
    content: "Corn basis at CHS Minot is -18 cents as of Feb 2026",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.85,
    created_at: daysAgo(5),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["corn", "basis"],
  },

  // --- Weather-related ---
  {
    id: "mem-015",
    content: "Farm location coordinates are 48.23N, -101.29W (north of Minot)",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.98,
    created_at: daysAgo(60),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["location", "weather"],
  },
  {
    id: "mem-016",
    content: "Prefers to see spray window forecasts for 48-hour windows",
    memory_type: "preference",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: daysAgo(50),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "weather", "spraying"],
  },

  // --- Scale tickets ---
  {
    id: "mem-017",
    content: "Uses voice entry method for scale tickets while in the truck",
    memory_type: "preference",
    memory_tier: "episodic",
    confidence: 0.85,
    created_at: daysAgo(12),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "scale-tickets"],
  },
  {
    id: "mem-018",
    content: "Scale ticket #2026-0147: 540 bu corn, CHS Minot, Feb 15 2026, moisture 14.2%",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.95,
    created_at: daysAgo(9),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["scale-tickets", "corn"],
  },

  // --- Equipment ---
  {
    id: "mem-019",
    content: "Runs a John Deere S780 combine and three Peterbilt trucks",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.88,
    created_at: daysAgo(90),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["equipment"],
  },

  // --- Financial (non-PII) ---
  {
    id: "mem-020",
    content: "Target breakeven for corn is $4.25/bushel including all costs",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.85,
    created_at: daysAgo(45),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["financial", "corn"],
  },

  // --- Old memories (recency test) ---
  {
    id: "mem-021",
    content: "Corn basis at CHS Minot was -30 cents in August 2025",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.9,
    created_at: daysAgo(200),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["corn", "basis", "old"],
  },

  // --- Working tier memories ---
  {
    id: "mem-022",
    content: "Asked about weather this morning, seemed satisfied with the format",
    memory_type: "outcome",
    memory_tier: "working",
    confidence: 0.6,
    created_at: daysAgo(1),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["working", "weather"],
  },
  {
    id: "mem-023",
    content: "Mentioned something about checking grain bids later",
    memory_type: "outcome",
    memory_tier: "working",
    confidence: 0.4,
    created_at: daysAgo(1),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["working", "grain-bids"],
  },

  // --- More facts for diversity ---
  {
    id: "mem-024",
    content: "Farm is in Ward County, North Dakota, USDA zone 3b",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.95,
    created_at: daysAgo(60),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["location"],
  },
  {
    id: "mem-025",
    content: "Uses Bayer crop protection products exclusively",
    memory_type: "preference",
    memory_tier: "episodic",
    confidence: 0.75,
    created_at: daysAgo(30),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "chemicals"],
  },
  {
    id: "mem-026",
    content: "Landlord expects 50/50 crop share on the south 600 acres",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: daysAgo(90),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["financial", "land"],
  },
  {
    id: "mem-027",
    content: "Insurance coverage on corn is at 80% APH, RP policy",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.88,
    created_at: daysAgo(120),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["financial", "insurance", "corn"],
  },
  {
    id: "mem-028",
    content: "Plans to add sunflowers to rotation in 2027",
    memory_type: "commitment",
    memory_tier: "episodic",
    confidence: 0.6,
    created_at: daysAgo(14),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["commitment", "sunflowers"],
  },
  {
    id: "mem-029",
    content: "Soil tests from fall 2025 showed low potassium in north fields",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.82,
    created_at: daysAgo(100),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["soil", "nutrients"],
  },
  {
    id: "mem-030",
    content: "Prefers text-based responses over charts or images in Discord",
    memory_type: "preference",
    memory_tier: "knowledge",
    confidence: 0.92,
    created_at: daysAgo(55),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "format"],
  },
];

/** Get non-tombstoned memories for testing */
export function getActiveMemories(): FarmMemoryFixture[] {
  return FARM_MEMORIES.filter((m) => !m.is_tombstoned);
}

/** Get memories matching any of the given tags */
export function getMemoriesByTag(...tags: string[]): FarmMemoryFixture[] {
  return FARM_MEMORIES.filter((m) =>
    tags.some((t) => m.tags.includes(t)) && !m.is_tombstoned
  );
}
