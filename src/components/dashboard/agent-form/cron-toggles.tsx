import { Switch } from "@/components/ui/switch";
import { CalendarPlus, Clock, Trash2 } from "lucide-react";

interface CustomScheduleSummary {
  id: string;
  display_name: string | null;
  cron_expression: string;
  enabled: boolean;
}

interface CronTogglesProps {
  customSchedules?: CustomScheduleSummary[];
  onAddCustomSchedule?: () => void;
  onToggleCustomSchedule?: (id: string, enabled: boolean) => void;
  onDeleteCustomSchedule?: (id: string) => void;
}

export function CronToggles({
  customSchedules,
  onAddCustomSchedule,
  onToggleCustomSchedule,
  onDeleteCustomSchedule,
}: CronTogglesProps) {
  const hasSchedules = customSchedules && customSchedules.length > 0;

  return (
    <div>
      <label className="block text-sm text-text-secondary mb-2">
        Schedules
      </label>

      {hasSchedules ? (
        <div className="space-y-2">
          {customSchedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center gap-2 text-sm text-foreground/70"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">
                {schedule.display_name || schedule.cron_expression}
              </span>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {onToggleCustomSchedule && (
                  <Switch
                    checked={schedule.enabled}
                    onChange={() => onToggleCustomSchedule(schedule.id, !schedule.enabled)}
                  />
                )}
                {onDeleteCustomSchedule && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomSchedule(schedule.id)}
                    className="text-text-dim hover:text-destructive transition-colors cursor-pointer p-1"
                    aria-label={`Delete ${schedule.display_name || "schedule"}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-dim">
          No schedules configured. {onAddCustomSchedule ? "Add one below." : "Save the agent first, then add schedules."}
        </p>
      )}

      {onAddCustomSchedule && (
        <button
          type="button"
          onClick={onAddCustomSchedule}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-foreground/50 hover:text-foreground/70 transition-colors"
        >
          <Clock className="w-3 h-3" />
          Add custom schedule
        </button>
      )}
    </div>
  );
}
