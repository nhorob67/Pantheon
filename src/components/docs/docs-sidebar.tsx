"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";
import type { NavSection } from "@/lib/docs/schema";
import { Sheet } from "@/components/ui/sheet";

interface DocsSidebarProps {
  navigation: NavSection[];
}

function SidebarContent({
  navigation,
  onNavigate,
}: DocsSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <nav className="py-6 px-4 space-y-1">
      {navigation.map((section) => {
        const isCollapsed = collapsed[section.title] ?? false;
        const sectionId = section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        return (
          <div key={section.title} className="mb-2">
            <button
              type="button"
              onClick={() => toggleSection(section.title)}
              aria-expanded={!isCollapsed}
              aria-controls={`docs-nav-section-${sectionId}`}
              className="flex items-center gap-2 w-full px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  isCollapsed ? "" : "rotate-90"
                }`}
              />
              {section.title}
            </button>

            <div
              id={`docs-nav-section-${sectionId}`}
              hidden={isCollapsed}
              className="ml-3 border-l border-border-light space-y-0.5"
            >
                {section.items.map((item) => {
                  const href = `/docs/${item.slug}`;
                  const isActive = pathname === href;

                  return (
                    <Link
                      key={item.slug}
                      href={href}
                      onClick={onNavigate}
                      className={`block pl-3 pr-2 py-1.5 text-sm no-underline transition-colors rounded-r-md ${
                        isActive
                          ? "text-accent font-medium bg-accent-dim border-l-2 border-accent -ml-px"
                          : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
                      }`}
                    >
                      {item.title}
                    </Link>
                  );
                })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function DocsSidebar({ navigation }: DocsSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-72 border-r border-border bg-bg-dark sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto shrink-0">
        <SidebarContent navigation={navigation} />
      </aside>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open documentation navigation"
        aria-expanded={mobileOpen}
        aria-controls="docs-mobile-navigation"
        className="md:hidden fixed bottom-6 right-6 z-40 w-12 h-12 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-[rgba(196,136,63,0.2)] cursor-pointer"
      >
        <Menu className="w-5 h-5 text-bg-deep" />
      </button>

      {/* Mobile drawer */}
      <Sheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side="left"
        ariaLabel="Documentation navigation"
        panelClassName="md:hidden bg-bg-dark"
        initialFocusRef={closeButtonRef}
      >
        <div id="docs-mobile-navigation" className="px-4 py-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="text-sm font-semibold font-headline">
              Navigation
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close documentation navigation"
              className="p-1 text-text-dim hover:text-text-primary cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <SidebarContent
            navigation={navigation}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </Sheet>
    </>
  );
}
