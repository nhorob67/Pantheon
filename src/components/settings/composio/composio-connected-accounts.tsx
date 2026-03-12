"use client";

import React, { useState } from "react";
import type { ComposioConnectedApp } from "@/types/composio";
import { COMPOSIO_TOOLKITS } from "@/lib/composio/toolkits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ToolkitIcon } from "./toolkit-icon";

interface Props {
  selectedToolkits: string[];
  connections: ComposioConnectedApp[];
  onConnect: (appId: string) => void;
  onDisconnect: (appId: string) => void;
  onRefresh: () => void;
}

const statusVariant: Record<ComposioConnectedApp["status"], "success" | "warning" | "error" | "neutral"> = {
  connected: "success",
  expired: "warning",
  disconnected: "neutral",
  pending: "info" as "neutral",
};

const statusLabel: Record<ComposioConnectedApp["status"], string> = {
  connected: "Connected",
  expired: "Expired",
  disconnected: "Disconnected",
  pending: "Pending",
};

export function ComposioConnectedAccounts({
  selectedToolkits,
  connections,
  onConnect,
  onDisconnect,
  onRefresh,
}: Props) {
  const [connectDialogApp, setConnectDialogApp] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const authToolkits = COMPOSIO_TOOLKITS.filter(
    (t) => selectedToolkits.includes(t.id) && t.requires_auth
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const dialogToolkit = connectDialogApp
    ? COMPOSIO_TOOLKITS.find((t) => t.id === connectDialogApp)
    : null;

  if (authToolkits.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h4 className="font-headline text-base text-foreground">
              Connected Accounts
            </h4>
            <p className="text-foreground/50 text-sm mt-0.5">
              Authorize your assistant to access these services.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Refresh
          </Button>
        </div>

        <div className="p-6">
          {authToolkits.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
              <svg
                className="w-8 h-8 text-foreground/30 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
              <p className="text-foreground/50 text-sm">
                Select toolkits above to connect accounts.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {authToolkits.map((toolkit) => {
                const connection = connections.find(
                  (c) => c.app_id === toolkit.id
                );
                const isConnected = connection?.status === "connected";

                return (
                  <div
                    key={toolkit.id}
                    className="rounded-lg border border-border px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground/60">
                        <ToolkitIcon icon={toolkit.icon} />
                      </div>
                      <div>
                        <span className="font-body text-sm font-medium text-foreground">
                          {toolkit.name}
                        </span>
                        {connection?.account_identifier && (
                          <p className="text-foreground/40 text-xs">
                            {connection.account_identifier}
                          </p>
                        )}
                      </div>
                      {connection && (
                        <Badge variant={statusVariant[connection.status]}>
                          {statusLabel[connection.status]}
                        </Badge>
                      )}
                    </div>
                    <div>
                      {isConnected ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDisconnect(connection.id)}
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConnectDialogApp(toolkit.id)}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pre-OAuth confirmation dialog */}
      <Dialog
        open={!!connectDialogApp}
        onClose={() => setConnectDialogApp(null)}
        title={`Connect ${dialogToolkit?.name || ""}`}
        size="sm"
      >
        {dialogToolkit && (
          <div className="space-y-4">
            <p className="text-foreground/70 text-sm">
              Your assistant will be able to access {dialogToolkit.name} on your
              behalf. This connection uses secure OAuth — your credentials are
              never stored on our servers.
            </p>

            <div className="rounded-lg bg-muted p-3 space-y-2">
              <p className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
                Permissions
              </p>
              {dialogToolkit.actions.map((action) => (
                <div
                  key={action}
                  className="flex items-center gap-2 text-sm text-foreground/70"
                >
                  <svg
                    className="w-3.5 h-3.5 text-primary shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{formatAction(action)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 text-xs text-foreground/50">
              <svg
                className="w-4 h-4 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <span>
                You can disconnect at any time. Composio acts as a secure proxy
                and does not store your service credentials.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConnectDialogApp(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onConnect(dialogToolkit.id);
                  setConnectDialogApp(null);
                }}
                className="flex-1"
              >
                Authorize {dialogToolkit.name}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

function formatAction(action: string): string {
  // GOOGLESHEETS_READ_SPREADSHEET → Read Spreadsheet
  const parts = action.split("_");
  parts.shift(); // Remove prefix (GOOGLESHEETS, GMAIL, etc.)
  return parts
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(" ");
}
