import { MessageSquare, Clock, Zap, DollarSign } from "lucide-react";

interface QuickStatsProps {
  messagesToday: number;
  uptimeHours: number;
  tokensUsed: string;
  monthlyCost: string;
}

export function QuickStats({
  messagesToday,
  uptimeHours,
  tokensUsed,
  monthlyCost,
}: QuickStatsProps) {
  const stats = [
    {
      label: "Messages Today",
      value: messagesToday,
      icon: MessageSquare,
      color: "text-primary",
      bg: "bg-primary/10",
      borderColor: "border-t-primary",
    },
    {
      label: "Uptime (hrs)",
      value: uptimeHours,
      icon: Clock,
      color: "text-intelligence",
      bg: "bg-intelligence/10",
      borderColor: "border-t-intelligence",
    },
    {
      label: "Tokens Used",
      value: tokensUsed,
      icon: Zap,
      color: "text-energy",
      bg: "bg-energy/10",
      borderColor: "border-t-energy",
    },
    {
      label: "Est. Monthly",
      value: monthlyCost,
      icon: DollarSign,
      color: "text-foreground",
      bg: "bg-muted",
      borderColor: "border-t-foreground/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`bg-card rounded-xl border border-border border-t-2 ${stat.borderColor} shadow-sm p-5`}
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
