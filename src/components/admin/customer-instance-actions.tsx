"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Square, Play } from "lucide-react";

interface Props {
  instanceId: string;
}

export function CustomerInstanceActions({ instanceId }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function performAction(action: "restart" | "stop" | "start") {
    setLoading(action);
    await fetch(`/api/admin/instances/${instanceId}/${action}`, {
      method: "POST",
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => performAction("restart")}
        disabled={loading !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50"
      >
        <RotateCw className={`w-3 h-3 ${loading === "restart" ? "animate-spin" : ""}`} />
        Restart
      </button>
      <button
        onClick={() => performAction("stop")}
        disabled={loading !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-energy/10 text-amber-700 rounded-lg hover:bg-energy/20 disabled:opacity-50"
      >
        <Square className="w-3 h-3" />
        Stop
      </button>
      <button
        onClick={() => performAction("start")}
        disabled={loading !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-intelligence/10 text-intelligence rounded-lg hover:bg-intelligence/20 disabled:opacity-50"
      >
        <Play className="w-3 h-3" />
        Start
      </button>
    </div>
  );
}
