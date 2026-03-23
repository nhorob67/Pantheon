"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  BookOpen,
  ExternalLink,
  Link2,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { Agent } from "@/types/agent";
import type { CustomSkill } from "@/types/custom-skill";
import type { SkillConfig } from "@/types/database";
import type { ComposioConfig } from "@/types/composio";
import { Sheet } from "@/components/ui/sheet";
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
  { id: "identity", label: "Identity", icon: UserRound },
  { id: "skills", label: "Skills & Tools", icon: Sparkles },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "links", label: "Quick Links", icon: Link2 },
] as const;

const DEEP_LINKS = [
  { href: "/settings/memory", label: "Memory Vault" },
  { href: "/settings/email", label: "Email" },
  { href: "/settings/mcp-servers", label: "MCP Servers" },
  { href: "/settings/billing", label: "Billing" },
];

type InspectorSectionId = (typeof SECTIONS)[number]["id"];

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
  const resolvedSection =
    SECTIONS.find((section) => section.id === activeSection)?.id ?? SECTIONS[0].id;

  // Escape to close — ref-based to avoid listener re-registration
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const setInspectorOpenRef = useRef(setInspectorOpen);
  setInspectorOpenRef.current = setInspectorOpen;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenRef.current) {
        setInspectorOpenRef.current(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openSection = useCallback(
    (id: InspectorSectionId) => {
      setActiveSection(id);
      setInspectorOpen(true);
    },
    [setActiveSection, setInspectorOpen]
  );

  const renderSectionContent = (sectionId: InspectorSectionId) => {
    if (sectionId === "identity") {
      return (
        <InspectorIdentitySection
          agent={agent}
          tenantId={tenantId}
          onAgentUpdated={onAgentUpdated}
        />
      );
    }

    if (sectionId === "skills") {
      return (
        <InspectorSkillsSection
          agent={agent}
          tenantId={tenantId}
          customSkills={customSkills}
          skillConfigs={skillConfigs}
          composioConfig={composioConfig}
          onAgentUpdated={onAgentUpdated}
        />
      );
    }

    if (sectionId === "knowledge") {
      return (
        <InspectorKnowledgeSection
          agentId={agent.id}
          knowledgeFiles={knowledgeFiles}
        />
      );
    }

    return (
      <div className="space-y-2">
        <Link
          href="/agents"
          className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Full Agent Editor
        </Link>
        {DEEP_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {link.label}
          </Link>
        ))}
      </div>
    );
  };

  const renderInspectorContent = () => (
    <div className="flex h-full flex-col bg-bg-card">
      <div className="border-b border-border bg-bg-card/95 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-text-dim">
              Agent Details
            </p>
            <h3 className="truncate text-sm font-medium text-text-primary">{agent.display_name}</h3>
            <p className="mt-0.5 truncate text-xs text-text-dim">{agent.role}</p>
          </div>
          <button
            type="button"
            onClick={() => setInspectorOpen(false)}
            className="rounded-lg p-2 text-text-dim transition-colors hover:bg-bg-surface hover:text-text-secondary"
            aria-label="Hide inspector"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const selected = resolvedSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => openSection(section.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  selected
                    ? "border-accent/40 bg-accent/10 text-text-primary"
                    : "border-border bg-bg-deep text-text-dim hover:border-border-light hover:text-text-secondary"
                }`}
                aria-pressed={selected}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {renderSectionContent(resolvedSection)}
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden h-full shrink-0 xl:flex">
        <div className="flex h-full w-14 shrink-0 flex-col items-center gap-2 border-l border-border bg-bg-card/90 px-2 py-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setInspectorOpen(!isOpen)}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
              isOpen
                ? "border-accent/30 bg-accent/10 text-text-primary"
                : "border-border bg-bg-deep text-text-dim hover:border-border-light hover:text-text-secondary"
            }`}
            aria-label={isOpen ? "Hide inspector" : "Show inspector"}
            aria-pressed={isOpen}
          >
            {isOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>

          <div className="mt-3 flex flex-col items-center gap-2">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const selected = resolvedSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => openSection(section.id)}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
                    selected
                      ? "border-accent/30 bg-accent/10 text-text-primary"
                      : "border-border bg-bg-deep text-text-dim hover:border-border-light hover:text-text-secondary"
                  }`}
                  aria-label={section.label}
                  aria-pressed={selected}
                  title={section.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="overflow-hidden border-l border-border bg-bg-card transition-[width,opacity] duration-200"
          style={{
            width: isOpen ? 360 : 0,
            opacity: isOpen ? 1 : 0,
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          aria-hidden={!isOpen}
        >
          {isOpen ? <div className="h-full w-[360px]">{renderInspectorContent()}</div> : null}
        </div>
      </div>

      <div className="xl:hidden">
        <Sheet
          open={isOpen}
          onClose={() => setInspectorOpen(false)}
          side="right"
          ariaLabel={`${agent.display_name} details`}
          panelClassName="!w-[min(100vw,24rem)]"
        >
          {renderInspectorContent()}
        </Sheet>
      </div>
    </>
  );
}
