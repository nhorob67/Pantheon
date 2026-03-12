"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { CustomerRow } from "@/lib/queries/admin-lists";

const statusColors: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  past_due: "bg-energy/10 text-amber-700",
  canceled: "bg-destructive/10 text-destructive",
  incomplete: "bg-muted text-foreground/60",
};

const instanceStatusColors: Record<string, string> = {
  running: "bg-primary/10 text-primary",
  stopped: "bg-energy/10 text-amber-700",
  error: "bg-destructive/10 text-destructive",
  provisioning: "bg-intelligence/10 text-intelligence",
};

interface CustomerTableProps {
  customers: CustomerRow[];
  total: number;
  page: number;
  perPage: number;
  search: string;
  status: string;
  state: string;
}

export function CustomerTable({
  customers,
  total,
  page,
  perPage,
  search,
  status,
  state,
}: CustomerTableProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setSearchInput(search);
  }

  function updateParams(
    updates: Partial<{
      page: string;
      search: string;
      status: string;
      state: string;
    }>
  ) {
    const next = {
      page: String(page),
      search,
      status,
      state,
      ...updates,
    };
    const params = new URLSearchParams();

    if (next.page && next.page !== "1") params.set("page", next.page);
    if (next.search) params.set("search", next.search);
    if (next.status) params.set("status", next.status);
    if (next.state) params.set("state", next.state);

    const query = params.toString();
    router.push(query ? `/admin/customers?${query}` : "/admin/customers");
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Search email or team name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                updateParams({ search: searchInput.trim(), page: "1" });
            }}
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value, page: "1" })}
          className="border border-border rounded-lg bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
          <option value="incomplete">Incomplete</option>
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-foreground/60">Email</th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">Team</th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">Subscription</th>
              <th className="text-left px-4 py-3 font-medium text-foreground/60">Instance</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-foreground/40">
                  No customers found
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const profile = c.team_profiles?.[0];
                const instance = c.instances?.[0];
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="text-primary hover:underline"
                      >
                        {c.email || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {profile?.team_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-mono uppercase px-2 py-0.5 rounded-full ${
                          statusColors[c.subscription_status] || "bg-muted text-foreground/60"
                        }`}
                      >
                        {c.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {instance ? (
                        <span
                          className={`text-xs font-mono uppercase px-2 py-0.5 rounded-full ${
                            instanceStatusColors[instance.status] || "bg-muted text-foreground/60"
                          }`}
                        >
                          {instance.status}
                        </span>
                      ) : (
                        <span className="text-foreground/40 text-xs">None</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-foreground/50">
            {total} customer{total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-foreground/60">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
