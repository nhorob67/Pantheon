import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { NavItem } from "@/lib/docs/schema";

interface DocPaginationProps {
  prev: NavItem | null;
  next: NavItem | null;
}

export function DocPagination({ prev, next }: DocPaginationProps) {
  return (
    <div className="mt-16 pt-8 border-t border-border flex justify-between gap-4">
      {prev ? (
        <Link
          href={`/docs/${prev.slug}`}
          className="group flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <div className="text-right">
            <div className="text-xs text-text-dim">Previous</div>
            <div className="text-sm font-medium">{prev.title}</div>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="group flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors no-underline ml-auto"
        >
          <div>
            <div className="text-xs text-text-dim">Next</div>
            <div className="text-sm font-medium">{next.title}</div>
          </div>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
