import type { ToolSet } from "ai";

let _composioPromise: Promise<import("@composio/core").Composio<
  import("@composio/vercel").VercelProvider
> | null> | null = null;

function getComposioInstance(): Promise<import("@composio/core").Composio<
  import("@composio/vercel").VercelProvider
> | null> {
  if (_composioPromise) return _composioPromise;

  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey || apiKey === "mock") return Promise.resolve(null);

  _composioPromise = (async () => {
    const [{ Composio }, { VercelProvider }] = await Promise.all([
      import("@composio/core"),
      import("@composio/vercel"),
    ]);

    return new Composio({
      apiKey,
      provider: new VercelProvider(),
    });
  })();

  return _composioPromise;
}

/**
 * Fetch Composio tools for a specific customer's agent, filtered to allowed toolkit IDs.
 * Returns an empty ToolSet if Composio is not configured or on any error.
 */
export async function getComposioToolsForAgent(
  composioUserId: string,
  toolkitIds: string[]
): Promise<ToolSet> {
  if (toolkitIds.length === 0) return {};

  const composio = await getComposioInstance();
  if (!composio) return {};

  try {
    const tools = await composio.tools.get(composioUserId, {
      toolkits: toolkitIds,
    });

    return tools ?? {};
  } catch (err) {
    console.error(
      "[composio-sdk] Failed to fetch tools for customer",
      composioUserId,
      err instanceof Error ? err.message : err
    );
    return {};
  }
}
