"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";
import type { NavSection } from "@/lib/docs/schema";

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

        return (
          <div key={section.title} className="mb-2">
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center gap-2 w-full px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim hover:text-text-secondary transition-colors cursor-pointer"
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  isCollapsed ? "" : "rotate-90"
                }`}
              />
              {section.title}
            </button>

            {!isCollapsed && (
              <div className="ml-3 border-l border-border-light space-y-0.5">
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
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function DocsSidebar({ navigation }: DocsSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-72 border-r border-border bg-bg-dark sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto shrink-0">
        <SidebarContent navigation={navigation} />
      </aside>

      {/* Mobile FAB */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 w-12 h-12 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-[rgba(196,136,63,0.2)] cursor-pointer"
      >
        <Menu className="w-5 h-5 text-bg-deep" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-bg-dark border-r border-border overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <span
                className="text-sm font-semibold font-headline"
              >
                Navigation
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-text-dim hover:text-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent
              navigation={navigation}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </>
      )}
    </>
  );
}
