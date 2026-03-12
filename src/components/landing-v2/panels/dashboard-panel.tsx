interface DashboardPanelProps {
  title: string;
  status?: "active" | "inactive";
  meta?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardPanel({ title, status = "active", meta, children, className }: DashboardPanelProps) {
  return (
    <div className={`dashboard-panel ${className ?? ""}`}>
      <div className="panel-header">
        <span className={`panel-header-dot ${status === "inactive" ? "inactive" : ""}`} />
        <span className="panel-header-title">{title}</span>
        {meta && <span className="panel-header-meta">{meta}</span>}
      </div>
      <div className="panel-body">
        {children}
      </div>
    </div>
  );
}
