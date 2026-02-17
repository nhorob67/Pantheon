import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getComposioClient } from "@/lib/composio/client";
import type { ComposioConnectedApp } from "@/types/composio";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(callbackPage("Authentication required.", false), {
      status: 401,
      headers: { "Content-Type": "text/html" },
    });
  }

  const { data: instance } = await supabase
    .from("instances")
    .select("*, customers!inner(user_id)")
    .eq("id", id)
    .single();

  if (!instance || instance.customers.user_id !== user.id) {
    return new NextResponse(callbackPage("Instance not found.", false), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  const admin = createAdminClient();
  const { data: config } = await admin
    .from("composio_configs")
    .select("id, composio_user_id, connected_apps")
    .eq("instance_id", id)
    .single();

  if (!config) {
    return new NextResponse(callbackPage("Integration not configured.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Sync connection status from Composio
  const composio = getComposioClient();
  const accounts = await composio.getConnectedAccounts(config.composio_user_id);

  const connectedApps: ComposioConnectedApp[] = accounts.map((a) => ({
    app_id: a.app_id,
    app_name: a.app_name,
    status: a.status === "ACTIVE" ? "connected" : "disconnected",
    account_identifier: a.account_identifier,
    connected_at: a.created_at,
  }));

  await admin
    .from("composio_configs")
    .update({
      connected_apps: connectedApps,
      last_sync_at: new Date().toISOString(),
    })
    .eq("id", config.id);

  return new NextResponse(callbackPage("Connection successful!", true), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

function callbackPage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html>
<head><title>FarmClaw - Composio</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#0f1209;color:#f0ece4">
  <h2>${success ? "Connected" : "Error"}</h2>
  <p>${message}</p>
  <p style="color:#888;font-size:14px">This window will close automatically.</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "composio-oauth-complete", success: ${success} }, "*");
    }
    setTimeout(() => window.close(), 2000);
  </script>
</body>
</html>`;
}
