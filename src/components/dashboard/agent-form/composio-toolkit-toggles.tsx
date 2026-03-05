import { Switch } from "@/components/ui/switch";
import { COMPOSIO_TOOLKITS } from "@/lib/composio/toolkits";
import { ToolkitIcon } from "@/components/settings/composio/toolkit-icon";
import { Plug } from "lucide-react";

interface ComposioToolkitTogglesProps {
  enabledToolkits: string[];
  connectedAppIds: Set<string>;
  selected: string[];
  onToggle: (id: string) => void;
}

export function ComposioToolkitToggles({
  enabledToolkits,
  connectedAppIds,
  selected,
  onToggle,
}: ComposioToolkitTogglesProps) {
  const toolkits = COMPOSIO_TOOLKITS.filter((t) =>
    enabledToolkits.includes(t.id)
  );

  if (toolkits.length === 0) return null;

  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
        <Plug className="w-4 h-4" />
        Connected Integrations
      </label>
      <div className="space-y-3">
        {toolkits.map((toolkit) => {
          const isConnected =
            !toolkit.requires_auth || connectedAppIds.has(toolkit.id);
          const checked = selected.includes(toolkit.id);

          return (
            <div key={toolkit.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-text-secondary shrink-0">
                  <ToolkitIcon icon={toolkit.icon} />
                </span>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isConnected ? "text-text-primary" : "text-text-dim"
                    }`}
                  >
                    {toolkit.name}
                    {!isConnected && (
                      <span className="ml-2 text-xs text-text-dim">
                        (not connected)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-dim">{toolkit.description}</p>
                </div>
              </div>
              <Switch
                checked={checked && isConnected}
                onChange={() => onToggle(toolkit.id)}
                disabled={!isConnected}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
