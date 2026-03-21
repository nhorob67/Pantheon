"use client";

import { useEffect, useCallback } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Agent } from "@/types/agent";
import type { CustomSkill } from "@/types/custom-skill";
import type { SkillConfig } from "@/types/database";
import type { ComposioConfig } from "@/types/composio";
import {
  useInspectorOpen,
  useActiveInspectorSection,
  useWorkspace,
} from "@/hooks/use-workspace";
import { InspectorIdentitySection } from "./inspector-identity-section";
import { InspectorSkillsSection } from "./inspector-skills-section";
import { InspectorKnowledgeSection } from "./inspector-knowledge-section";

interface KnowledgeFile {
  id: string;
  file_name: string;
  file_type: string;
  agent_id: string | null;
}

interface InspectorPanelProps {
  agent: Agent;
  tenantId: string;
  customSkills: CustomSkill[];
  skillConfigs: SkillConfig[];
  composioConfig: ComposioConfig | null;
  knowledgeFiles: KnowledgeFile[];
  onAgentUpdated: () => void;
}

const SECTIONS = [
  { id: "identity", label: "Identity" },
  { id: "skills", label: "Skills & Tools" },
  { id: "knowledge", label: "Knowledge" },
  { id: "links", label: "Quick Links" },
] as const;

const DEEP_LINKS = [
  { href: "/settings/memory", label: "Memory Vault" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/mcp-servers", label: "MCP Servers" },
  { href: "/settings/billing", label: "Billing" },
];

export function InspectorPanel({
  agent,
  tenantId,
  customSkills,
  skillConfigs,
  composioConfig,
  knowledgeFiles,
  onAgentUpdated,
}: InspectorPanelProps) {
  const isOpen = useInspectorOpen();
  const activeSection = useActiveInspectorSection();
  const setActiveSection = useWorkspace((s) => s.setActiveInspectorSection);
  const setInspectorOpen = useWorkspace((s) => s.setInspectorOpen);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setInspectorOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setInspectorOpen]);

  const toggleSection = useCallback(
    (id: string) => {
      setActiveSection(activeSection === id ? null : id);
    },
    [activeSection, setActiveSection]
  );

  return (
    <div
      className="border-l border-border bg-bg-card shrink-0 overflow-hidden transition-[width,opacity] duration-200"
      style={{
        width: isOpen ? 380 : 0,
        opacity: isOpen ? 1 : 0,
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        className="w-[380px] h-full overflow-y-auto transition-opacity duration-100"
        style={{
          opacity: isOpen ? 1 : 0,
          transitionDelay: isOpen ? "100ms" : "0ms",
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium text-text-primary">{agent.display_name}</h3>
          <p className="text-xs text-text-dim mt-0.5">Inspector</p>
        </div>

        {/* Accordion sections */}
        {SECTIONS.map((section) => (
          <div key={section.id} className="border-b border-border">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
              aria-expanded={activeSection === section.id}
            >
              {section.label}
              <ChevronRight
                className={`w-4 h-4 text-text-dim transition-transform duration-200 ${
                  activeSection === section.id ? "rotate-90" : ""
                }`}
              />
            </button>

            {activeSection === section.id && (
              <div className="px-4 pb-3">
                {section.id === "identity" && (
                  <InspectorIdentitySection
                    agent={agent}
                    tenantId={tenantId}
                    onAgentUpdated={onAgentUpdated}
                  />
                )}
                {section.id === "skills" && (
                  <InspectorSkillsSection
                    agent={agent}
                    tenantId={tenantId}
                    customSkills={customSkills}
                    skillConfigs={skillConfigs}
                    composioConfig={composioConfig}
                    onAgentUpdated={onAgentUpdated}
                  />
                )}
                {section.id === "knowledge" && (
                  <InspectorKnowledgeSection
                    agentId={agent.id}
                    knowledgeFiles={knowledgeFiles}
                  />
                )}
                {section.id === "links" && (
                  <div className="space-y-1.5">
                    <Link
                      href="/agents"
                      className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Full Agent Editor
                    </Link>
                    {DEEP_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
