"use client";

import React, { useState } from "react";
import type { IntegrationSummary } from "@/types/integration";
import {
  Globe,
  CalendarClock,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from "lucide-react";

interface Props {
  integration: IntegrationSummary;
  onToggleStatus: (id: string, status: "active" | "inactive") => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  inactive: "bg-foreground/10 text-foreground/50",
  error: "bg-red-500/20 text-red-400",
};

export function IntegrationCard({
  integration,
  onToggleStatus,
  onDelete,
  loading,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isActive = integration.status === "active";
  const statusColor = STATUS_COLORS[integration.status] ?? STATUS_COLORS.inactive;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">
              {integration.display_name}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
            >
              {integration.status}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-foreground/50 mb-2">
            <span className="font-mono">{integration.slug}</span>
            <span>{integration.service_type}</span>
          </div>

          {integration.base_url && (
            <div className="flex items-center gap-1 text-xs text-foreground/40 mb-1">
              <Globe className="w-3 h-3" />
              <a
                href={integration.base_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors truncate"
              >
                {integration.base_url}
                <ExternalLink className="w-2.5 h-2.5 inline ml-1" />
              </a>
            </div>
          )}

          {integration.capabilities_summary && (
            <p className="text-xs text-foreground/50 mt-1 line-clamp-2">
              {integration.capabilities_summary}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-foreground/40">
            {integration.schedule_count > 0 && (
              <span className="flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                {integration.schedule_count} schedule
                {integration.schedule_count !== 1 ? "s" : ""}
              </span>
            )}
            {integration.last_used_at && (
              <span>
                Last used{" "}
                {new Date(integration.last_used_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              onToggleStatus(
                integration.id,
                isActive ? "inactive" : "active"
              )
            }
            disabled={loading}
            className="p-1.5 rounded-md text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
            title={isActive ? "Deactivate" : "Activate"}
          >
            {isActive ? (
              <ToggleRight className="w-4 h-4 text-green-400" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
          </button>

          {confirmDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(integration.id);
                setConfirmDelete(false);
              }}
              disabled={loading}
              className="px-2 py-1 rounded-md text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={loading}
              className="p-1.5 rounded-md text-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
