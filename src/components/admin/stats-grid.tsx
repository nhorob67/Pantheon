import { Users, Server, DollarSign, Activity } from "lucide-react";

interface StatsGridProps {
  totalCustomers: number;
  activeTenants: number;
  mrr: string;
  tenantHealth: string;
}

export function StatsGrid({
  totalCustomers,
  activeTenants,
  mrr,
  tenantHealth,
}: StatsGridProps) {
  const stats = [
    {
      label: "Total Customers",
      value: totalCustomers,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Active Tenants",
      value: activeTenants,
      icon: Server,
      color: "text-intelligence",
      bg: "bg-intelligence/10",
    },
    {
      label: "MRR",
      value: mrr,
      icon: DollarSign,
      color: "text-energy",
      bg: "bg-energy/10",
    },
    {
      label: "Tenant Health",
      value: tenantHealth,
      icon: Activity,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-xl border border-border shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}
            >
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </div>
          <p className="font-mono text-2xl font-semibold text-foreground">
            {stat.value}
          </p>
          <p className="text-xs text-foreground/50 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
