import type { UsageSummary } from "@/types/billing";
import { formatTokens, formatCents } from "@/lib/utils/format";

interface UsageTableProps {
  data: UsageSummary[];
}

export function UsageTable({ data }: UsageTableProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-mono text-[11px] text-foreground/60 uppercase tracking-[0.12em]">
          Usage Breakdown
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-3 text-left text-xs font-mono text-foreground/50 tracking-[0.08em] uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-mono text-foreground/50 tracking-[0.08em] uppercase">
                Model
              </th>
              <th className="px-6 py-3 text-right text-xs font-mono text-foreground/50 tracking-[0.08em] uppercase">
                Input
              </th>
              <th className="px-6 py-3 text-right text-xs font-mono text-foreground/50 tracking-[0.08em] uppercase">
                Output
              </th>
              <th className="px-6 py-3 text-right text-xs font-mono text-foreground/50 tracking-[0.08em] uppercase">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-foreground/40"
                >
                  No usage data yet
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="px-6 py-3 text-foreground/70">{row.date}</td>
                  <td className="px-6 py-3 font-mono text-xs text-foreground/60">
                    {row.model}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-xs">
                    {formatTokens(row.input_tokens)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-xs">
                    {formatTokens(row.output_tokens)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-xs font-medium">
                    {formatCents(row.estimated_cost_cents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
