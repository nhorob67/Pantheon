import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbsProps {
  section: string;
  title: string;
}

export function Breadcrumbs({ section, title }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-text-dim mb-8">
      <Link
        href="/docs"
        className="hover:text-text-secondary transition-colors no-underline"
      >
        Docs
      </Link>
      <ChevronRight className="w-3.5 h-3.5" />
      <span>{section}</span>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="text-text-secondary">{title}</span>
    </nav>
  );
}
