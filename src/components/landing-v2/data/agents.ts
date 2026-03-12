import { Athena, Hermes, Ares, Apollo, Hephaestus, Artemis } from "../deity-marks";
import type { DeityMarkProps } from "../deity-marks";

type Clearance = "L1 ADVISORY" | "L2 OPERATIONAL" | "L3 FULL";

const CLEARANCE_CLASS: Record<Clearance, string> = {
  "L1 ADVISORY": "l1",
  "L2 OPERATIONAL": "l2",
  "L3 FULL": "l3",
};

export function getClearanceClass(clearance: Clearance): string {
  return CLEARANCE_CLASS[clearance];
}

export interface AgentData {
  name: string;
  domain: string;
  mark: React.ComponentType<DeityMarkProps>;
  capabilities: string[];
  missions: string[];
  clearance: Clearance;
  active: boolean;
  glowColor: string;
}

export const AGENTS: AgentData[] = [
  {
    name: "Athena",
    domain: "Executive Strategy",
    mark: Athena,
    capabilities: ["Daily briefing assembly", "Priority triage", "Decision tracking", "Cross-agent delegation"],
    missions: ["Triaging morning inbox", "Preparing daily briefing", "Tracking vendor deadlines"],
    clearance: "L3 FULL",
    active: true,
    glowColor: "rgba(212, 168, 73, 0.04)",
  },
  {
    name: "Hermes",
    domain: "Communications",
    mark: Hermes,
    capabilities: ["Email drafting and follow-ups", "Contact relationship tracking", "Meeting coordination"],
    missions: ["Drafting client proposal", "Following up with Lisa", "Scheduling team standup"],
    clearance: "L2 OPERATIONAL",
    active: true,
    glowColor: "rgba(74, 234, 204, 0.03)",
  },
  {
    name: "Ares",
    domain: "Operations & SOPs",
    mark: Ares,
    capabilities: ["Process enforcement", "Compliance monitoring", "Checklist management"],
    missions: ["Auditing onboarding checklist", "Updating safety protocols", "Reviewing compliance docs"],
    clearance: "L2 OPERATIONAL",
    active: false,
    glowColor: "rgba(199, 80, 80, 0.03)",
  },
  {
    name: "Apollo",
    domain: "Research & Analysis",
    mark: Apollo,
    capabilities: ["Vendor comparison reports", "Market research synthesis", "Data analysis and summaries"],
    missions: ["Comparing vendor proposals", "Compiling market report", "Analyzing Q4 results"],
    clearance: "L1 ADVISORY",
    active: true,
    glowColor: "rgba(212, 168, 73, 0.03)",
  },
  {
    name: "Hephaestus",
    domain: "Skills & Tooling",
    mark: Hephaestus,
    capabilities: ["Custom skill creation", "Integration configuration", "Workflow deployment"],
    missions: ["Building custom SOP skill", "Testing email integration", "Deploying new workflow"],
    clearance: "L3 FULL",
    active: true,
    glowColor: "rgba(196, 136, 63, 0.04)",
  },
  {
    name: "Artemis",
    domain: "Scheduling & Tracking",
    mark: Artemis,
    capabilities: ["Deadline surveillance", "Contract renewal alerts", "Milestone tracking", "Reminder dispatch"],
    missions: ["Monitoring contract renewals", "Sending deadline reminders", "Tracking project milestones"],
    clearance: "L2 OPERATIONAL",
    active: true,
    glowColor: "rgba(94, 140, 97, 0.03)",
  },
];
