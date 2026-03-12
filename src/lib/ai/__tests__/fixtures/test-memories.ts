/**
 * 30 realistic memory fixtures for quality and adversarial testing.
 * Used by memory-quality.test.ts, memory-adversarial.test.ts, and memory-release-gate.test.ts.
 */

export interface MemoryFixture {
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

export const TEST_MEMORIES: MemoryFixture[] = [
  // --- Project facts ---
  {
    id: "mem-001",
    content: "Team manages 12 active projects across 3 departments",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.95,
    created_at: daysAgo(30),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["projects", "capacity", "organization"],
  },
  {
    id: "mem-002",
    content: "Always routes deliverables to Acme Corp client portal",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: daysAgo(20),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["projects", "delivery", "vendor"],
  },
  {
    id: "mem-003",
    content: "Q1 revenue target is $180K per region for 2026",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.8,
    created_at: daysAgo(10),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["projects", "targets"],
  },

  // --- Operations facts ---
  {
    id: "mem-004",
    content: "Team has 8 active proposals in the pipeline for Q2",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.92,
    created_at: daysAgo(25),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["proposals", "capacity"],
  },
  {
    id: "mem-005",
    content: "Submitted final report to Globex Partners in 2025",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.85,
    created_at: daysAgo(180),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["proposals", "delivery", "vendor"],
  },

  // --- Resource facts ---
  {
    id: "mem-006",
    content: "Engineering headcount is 8 FTEs, onboarded mid-April",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.88,
    created_at: daysAgo(15),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["resources", "capacity", "staffing"],
  },

  // --- Preferences ---
  {
    id: "mem-007",
    content: "Prefers morning status briefings at 6am Central time",
    memory_type: "preference",
    memory_tier: "knowledge",
    confidence: 0.95,
    created_at: daysAgo(45),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "briefings", "schedule"],
  },
  {
    id: "mem-008",
    content: "Likes status updates summarized by project, not by vendor",
    memory_type: "preference",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: daysAgo(40),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "market-data"],
  },
  {
    id: "mem-009",
    content: "Does not want to hear about projections, only actuals",
    memory_type: "preference",
    memory_tier: "knowledge",
    confidence: 0.92,
    created_at: daysAgo(35),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "market-data"],
  },

  // --- Commitments ---
  {
    id: "mem-010",
    content: "Plans to submit the quarterly report to Acme Corp on Thursday",
    memory_type: "commitment",
    memory_tier: "episodic",
    confidence: 0.85,
    created_at: daysAgo(2),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["commitment", "projects", "delivery"],
  },
  {
    id: "mem-011",
    content: "Committed to finishing the audit review by end of week",
    memory_type: "commitment",
    memory_tier: "episodic",
    confidence: 0.8,
    created_at: daysAgo(3),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["commitment", "reviews"],
  },

  // --- Outcomes ---
  {
    id: "mem-012",
    content: "Delivered 12 project milestones to Acme Corp on Feb 15",
    memory_type: "outcome",
    memory_tier: "working",
    confidence: 0.95,
    created_at: daysAgo(9),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["outcome", "projects", "delivery"],
  },

  // --- Superseded memories ---
  {
    id: "mem-013",
    content: "Acme Corp contract margin is 15%",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.7,
    created_at: daysAgo(60),
    is_tombstoned: true,
    superseded_by: "mem-014",
    tags: ["projects", "margin", "superseded"],
  },
  {
    id: "mem-014",
    content: "Acme Corp contract margin is 22% as of Feb 2026",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.85,
    created_at: daysAgo(5),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["projects", "margin"],
  },

  // --- Location-related ---
  {
    id: "mem-015",
    content: "Team is headquartered in the North America region, Central timezone",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.98,
    created_at: daysAgo(60),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["location", "organization"],
  },
  {
    id: "mem-016",
    content: "Prefers to see project timeline forecasts for 48-hour windows",
    memory_type: "preference",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: daysAgo(50),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "timelines", "scheduling"],
  },

  // --- Work orders ---
  {
    id: "mem-017",
    content: "Uses voice entry method for work orders while on the go",
    memory_type: "preference",
    memory_tier: "episodic",
    confidence: 0.85,
    created_at: daysAgo(12),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "work-orders"],
  },
  {
    id: "mem-018",
    content: "Task record #2026-0147: 5 deliverables, Acme Corp, Feb 15 2026, priority high",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.95,
    created_at: daysAgo(9),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["work-orders", "projects"],
  },

  // --- Tools ---
  {
    id: "mem-019",
    content: "Uses Jira for project tracking and Slack for team communication",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.88,
    created_at: daysAgo(90),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["tools"],
  },

  // --- Financial (non-PII) ---
  {
    id: "mem-020",
    content: "Target breakeven for projects is $4.25K per unit including all costs",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.85,
    created_at: daysAgo(45),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["financial", "projects"],
  },

  // --- Old memories (recency test) ---
  {
    id: "mem-021",
    content: "Acme Corp contract margin was 10% in August 2025",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.9,
    created_at: daysAgo(200),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["projects", "margin", "old"],
  },

  // --- Working tier memories ---
  {
    id: "mem-022",
    content: "Asked about status updates this morning, seemed satisfied with the format",
    memory_type: "outcome",
    memory_tier: "working",
    confidence: 0.6,
    created_at: daysAgo(1),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["working", "briefings"],
  },
  {
    id: "mem-023",
    content: "Mentioned something about checking market data later",
    memory_type: "outcome",
    memory_tier: "working",
    confidence: 0.4,
    created_at: daysAgo(1),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["working", "market-data"],
  },

  // --- More facts for diversity ---
  {
    id: "mem-024",
    content: "Team operates in the North America region, Eastern division",
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
    content: "Uses Salesforce CRM products exclusively",
    memory_type: "preference",
    memory_tier: "episodic",
    confidence: 0.75,
    created_at: daysAgo(30),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["preference", "tools"],
  },
  {
    id: "mem-026",
    content: "Partner expects 50/50 revenue share on the enterprise accounts",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.9,
    created_at: daysAgo(90),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["financial", "partnerships"],
  },
  {
    id: "mem-027",
    content: "Insurance coverage on projects is at 80% liability, comprehensive policy",
    memory_type: "fact",
    memory_tier: "knowledge",
    confidence: 0.88,
    created_at: daysAgo(120),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["financial", "insurance", "projects"],
  },
  {
    id: "mem-028",
    content: "Plans to add a consulting service line in 2027",
    memory_type: "commitment",
    memory_tier: "episodic",
    confidence: 0.6,
    created_at: daysAgo(14),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["commitment", "services"],
  },
  {
    id: "mem-029",
    content: "Q3 2025 review showed low engagement in the enterprise segment",
    memory_type: "fact",
    memory_tier: "episodic",
    confidence: 0.82,
    created_at: daysAgo(100),
    is_tombstoned: false,
    superseded_by: null,
    tags: ["analytics", "metrics"],
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
export function getActiveMemories(): MemoryFixture[] {
  return TEST_MEMORIES.filter((m) => !m.is_tombstoned);
}

/** Get memories matching any of the given tags */
export function getMemoriesByTag(...tags: string[]): MemoryFixture[] {
  return TEST_MEMORIES.filter((m) =>
    tags.some((t) => m.tags.includes(t)) && !m.is_tombstoned
  );
}
