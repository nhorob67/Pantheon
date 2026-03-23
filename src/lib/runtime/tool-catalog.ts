import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CanonicalToolMeta,
  RiskLevel,
  ToolCapabilities,
  ToolCategory,
} from "./tool-contracts";

// ---------------------------------------------------------------------------
// Native Tool Catalog Entry
// ---------------------------------------------------------------------------

interface NativeToolEntry extends CanonicalToolMeta {
  /** Default status when seeded into tenant_tools */
  defaultStatus: "enabled" | "disabled";
  /** Default approval_mode when seeded into tenant_tool_policies */
  defaultApprovalMode: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function native(
  toolKey: string,
  displayName: string,
  description: string,
  category: ToolCategory,
  riskLevel: RiskLevel,
  capabilities: Partial<ToolCapabilities> & Pick<ToolCapabilities, "writesState">,
  overrides?: { defaultStatus?: "enabled" | "disabled"; defaultApprovalMode?: string }
): NativeToolEntry {
  return {
    toolKey,
    displayName,
    description,
    source: { type: "native" },
    category,
    riskLevel,
    capabilities: {
      networkAccess: capabilities.networkAccess ?? false,
      writesState: capabilities.writesState,
      requiresApproval: riskLevel === "high" || riskLevel === "critical",
      supportsStreaming: capabilities.supportsStreaming ?? false,
    },
    defaultStatus: overrides?.defaultStatus ?? "enabled",
    defaultApprovalMode: overrides?.defaultApprovalMode ?? "none",
  };
}

// ---------------------------------------------------------------------------
// Catalog definitions
// ---------------------------------------------------------------------------

const NATIVE_TOOLS: NativeToolEntry[] = [
  // ── Memory ──────────────────────────────────────────────────────────────
  native(
    "memory_write",
    "Memory Write",
    "Save a fact, preference, or commitment to long-term memory",
    "memory",
    "medium",
    { writesState: true }
  ),
  native(
    "memory_search",
    "Memory Search",
    "Search long-term memory for previously saved facts, preferences, and commitments",
    "memory",
    "low",
    { writesState: false }
  ),
  native(
    "memory_read",
    "Memory Read",
    "Fetch a specific memory record by ID",
    "memory",
    "low",
    { writesState: false }
  ),
  native(
    "conversation_search",
    "Conversation Search",
    "Search past conversation messages for specific topics, decisions, or discussions",
    "memory",
    "low",
    { writesState: false }
  ),

  // ── Schedules ───────────────────────────────────────────────────────────
  native(
    "schedule_create",
    "Schedule Create",
    "Create a recurring scheduled task with a cron expression",
    "schedule",
    "medium",
    { writesState: true }
  ),
  native(
    "schedule_list",
    "Schedule List",
    "List all active schedules for this team",
    "schedule",
    "low",
    { writesState: false }
  ),
  native(
    "schedule_toggle",
    "Schedule Toggle",
    "Enable or disable a schedule by its ID",
    "schedule",
    "medium",
    { writesState: true }
  ),
  native(
    "schedule_update",
    "Schedule Update",
    "Update a custom schedule's name, prompt, cron expression, or timezone",
    "schedule",
    "medium",
    { writesState: true }
  ),
  native(
    "schedule_delete",
    "Schedule Delete",
    "Delete a custom schedule by its ID",
    "schedule",
    "high",
    { writesState: true }
  ),

  // ── Self-Config (read-only) ─────────────────────────────────────────────
  native(
    "config_view_my_config",
    "View My Config",
    "View the current agent's configuration",
    "self-config",
    "low",
    { writesState: false }
  ),
  native(
    "config_list_agents",
    "List Agents",
    "List all active agents on this team",
    "self-config",
    "low",
    { writesState: false }
  ),

  // ── Self-Config (identity mutations — medium risk) ──────────────────────
  native(
    "config_set_my_goal",
    "Set My Goal",
    "Set a goal for this agent",
    "self-config",
    "medium",
    { writesState: true }
  ),
  native(
    "config_set_my_role",
    "Set My Role",
    "Set this agent's role",
    "self-config",
    "medium",
    { writesState: true }
  ),
  native(
    "config_set_my_backstory",
    "Set My Backstory",
    "Set context/backstory for this agent",
    "self-config",
    "medium",
    { writesState: true }
  ),
  native(
    "config_set_display_name",
    "Set Display Name",
    "Change this agent's display name",
    "self-config",
    "medium",
    { writesState: true }
  ),
  native(
    "config_toggle_skill",
    "Toggle Skill",
    "Add or remove a custom skill from this agent",
    "self-config",
    "medium",
    { writesState: true }
  ),

  // ── Self-Config (capability mutations — high risk) ──────────────────────
  native(
    "config_set_my_autonomy",
    "Set My Autonomy",
    "Set this agent's autonomy level",
    "self-config",
    "high",
    { writesState: true }
  ),
  native(
    "config_set_my_delegation",
    "Set My Delegation",
    "Control whether this agent can delegate and receive delegated tasks",
    "self-config",
    "high",
    { writesState: true }
  ),
  native(
    "config_update_team_profile",
    "Update Team Profile",
    "Update team profile fields (team-wide impact)",
    "self-config",
    "high",
    { writesState: true }
  ),
  native(
    "config_create_agent",
    "Create Agent",
    "Create a new agent for this team",
    "self-config",
    "high",
    { writesState: true }
  ),
  native(
    "config_archive_agent",
    "Archive Agent",
    "Archive (remove) an agent from this team",
    "self-config",
    "high",
    { writesState: true }
  ),
  native(
    "config_undo_last_change",
    "Undo Last Change",
    "Undo the most recent configuration change within 24 hours",
    "self-config",
    "high",
    { writesState: true }
  ),

  // ── Credentials ─────────────────────────────────────────────────────────
  native(
    "use_credential",
    "Use Credential",
    "Get an opaque credential handle for a stored secret",
    "credentials",
    "medium",
    { writesState: false }
  ),
  native(
    "reveal_secret",
    "Reveal Secret",
    "Break-glass: reveal the raw value of a stored secret (requires approval)",
    "credentials",
    "critical",
    { writesState: false },
    { defaultStatus: "disabled", defaultApprovalMode: "always" }
  ),

  // ── Delegation ─────────────────────────────────────────────────────────
  native(
    "delegate_task",
    "Delegate Task",
    "Delegate a task to another agent on your team for specialized handling",
    "delegation",
    "high",
    { writesState: false }
  ),
  native(
    "delegate_task_async",
    "Delegate Task (Async)",
    "Enqueue an asynchronous task for another agent and poll for results",
    "delegation",
    "high",
    { writesState: false }
  ),
  native(
    "delegation_poll",
    "Delegation Poll",
    "Check the status and collect results of async delegations",
    "delegation",
    "high",
    { writesState: false }
  ),
  native(
    "delegation_cancel",
    "Delegation Cancel",
    "Cancel an in-progress async delegation",
    "delegation",
    "high",
    { writesState: false }
  ),

  // ── Browser ──────────────────────────────────────────────────────────────
  native(
    "browser_navigate",
    "Browser Navigate",
    "Navigate to a URL in a headless browser",
    "browser",
    "high",
    { networkAccess: true, writesState: false },
    { defaultStatus: "disabled" }
  ),
  native(
    "browser_extract",
    "Browser Extract",
    "Extract structured data from the current browser page",
    "browser",
    "high",
    { networkAccess: false, writesState: false },
    { defaultStatus: "disabled" }
  ),
  native(
    "browser_click",
    "Browser Click",
    "Click an element on the current browser page by description",
    "browser",
    "high",
    { networkAccess: false, writesState: true },
    { defaultStatus: "disabled" }
  ),
  native(
    "browser_fill",
    "Browser Fill",
    "Fill a form field on the current browser page by description",
    "browser",
    "high",
    { networkAccess: false, writesState: true },
    { defaultStatus: "disabled" }
  ),
  native(
    "browser_screenshot",
    "Browser Screenshot",
    "Take a screenshot of the current browser page",
    "browser",
    "high",
    { networkAccess: false, writesState: false },
    { defaultStatus: "disabled" }
  ),

  // ── File Creation ──────────────────────────────────────────────────────
  native(
    "file_create",
    "File Create",
    "Create CSV, JSON, TXT, Markdown, or HTML files and deliver as Discord attachments",
    "file-creation",
    "medium",
    { writesState: true }
  ),

  // ── Follow-Up ──────────────────────────────────────────────────────────
  native(
    "task_follow_up",
    "Task Follow-Up",
    "Schedule a delayed follow-up to continue working on a task after a pause",
    "follow-up",
    "medium",
    { writesState: true }
  ),

  // ── Integrations ────────────────────────────────────────────────────────
  native(
    "integration_store_credential",
    "Store Integration Credential",
    "Securely store an API key or token for an external service integration",
    "integrations",
    "high",
    { writesState: true },
    { defaultApprovalMode: "owner" }
  ),
  native(
    "integration_register",
    "Register Integration",
    "Register a new external service integration with discovered API metadata",
    "integrations",
    "medium",
    { writesState: true }
  ),
  native(
    "integration_list",
    "List Integrations",
    "List all configured external service integrations for this workspace",
    "integrations",
    "low",
    { writesState: false }
  ),
  native(
    "integration_api_call",
    "Integration API Call",
    "Make an authenticated API call to a configured integration with automatic credential injection",
    "integrations",
    "medium",
    { networkAccess: true, writesState: false }
  ),
  native(
    "integration_templates",
    "Integration Templates",
    "Look up pre-built integration templates for common services with known endpoints and setup instructions",
    "integrations",
    "low",
    { writesState: false }
  ),

  // ── Network ─────────────────────────────────────────────────────────────
  native(
    "http_request",
    "HTTP Request",
    "Make an HTTP request to an external API with optional credential injection",
    "network",
    "medium",
    { networkAccess: true, writesState: false }
  ),
  native(
    "web_search",
    "Web Search",
    "Search the web for information with source attribution and citations",
    "network",
    "low",
    { networkAccess: true, writesState: false }
  ),
  native(
    "web_fetch",
    "Web Fetch",
    "Fetch and extract readable content from a public URL",
    "network",
    "low",
    { networkAccess: true, writesState: false }
  ),
];

// ---------------------------------------------------------------------------
// Indexed exports
// ---------------------------------------------------------------------------

/** All native tool catalog entries, indexed by toolKey. */
export const NATIVE_TOOL_CATALOG: ReadonlyMap<string, NativeToolEntry> = new Map(
  NATIVE_TOOLS.map((t) => [t.toolKey, t])
);

/** Ordered list of all native tool entries. */
export const NATIVE_TOOL_ENTRIES: ReadonlyArray<NativeToolEntry> = NATIVE_TOOLS;

/**
 * Look up canonical metadata for a native tool by key.
 * Returns undefined for dynamic tools (Composio, MCP) not in the static catalog.
 */
export function getNativeToolMeta(toolKey: string): NativeToolEntry | undefined {
  return NATIVE_TOOL_CATALOG.get(toolKey);
}

// ---------------------------------------------------------------------------
// Tenant provisioning
// ---------------------------------------------------------------------------

const ALL_ROLES = ["owner", "admin", "operator", "viewer"];

/**
 * In-process cache: once we've confirmed a tenant's native tools are seeded,
 * skip the DB check for the rest of this process lifetime.
 * Safe because native tools are static and never removed at runtime.
 */
const seededTenants = new Set<string>();

/** Reset the in-process cache (for testing only). */
export function _resetSeededTenantsCache(): void {
  seededTenants.clear();
}

/**
 * Ensure all native tools are registered in `tenant_tools` + `tenant_tool_policies`
 * for the given tenant. Idempotent — only inserts tools that don't already exist.
 *
 * Called from `resolveToolsForAgent()` before tool resolution, and by the
 * migration for existing tenants.
 */
export async function ensureNativeToolCatalog(
  admin: SupabaseClient,
  tenantId: string,
  customerId: string
): Promise<{ seeded: number }> {
  if (seededTenants.has(tenantId)) {
    return { seeded: 0 };
  }

  const toolKeys = NATIVE_TOOLS.map((t) => t.toolKey);

  // Find which tools already exist for this tenant
  const { data: existing, error: existingError } = await admin
    .from("tenant_tools")
    .select("id, tool_key")
    .eq("tenant_id", tenantId)
    .in("tool_key", toolKeys);

  if (existingError) {
    throw new Error(`Failed to check existing tools: ${existingError.message}`);
  }

  const existingKeys = new Set(
    (existing || []).map((r: { tool_key: string }) => r.tool_key)
  );
  const missing = NATIVE_TOOLS.filter((t) => !existingKeys.has(t.toolKey));

  if (missing.length === 0) {
    seededTenants.add(tenantId);
    return { seeded: 0 };
  }

  // Insert missing tool rows
  const { data: inserted, error: insertError } = await admin
    .from("tenant_tools")
    .insert(
      missing.map((t) => ({
        tenant_id: tenantId,
        customer_id: customerId,
        tool_key: t.toolKey,
        display_name: t.displayName,
        description: t.description,
        status: t.defaultStatus,
        risk_level: t.riskLevel,
        config: {},
        metadata: {
          provider: "native",
          category: t.category,
          seeded_by: "native_tool_catalog",
        },
      }))
    )
    .select("id, tool_key");

  if (insertError && insertError.code !== "23505") {
    throw new Error(`Failed to seed native tools: ${insertError.message}`);
  }

  const insertedRows = (inserted || []) as Array<{ id: string; tool_key: string }>;
  if (insertedRows.length === 0) {
    return { seeded: 0 };
  }

  // Build a lookup to find the right approval_mode per tool
  const entryByKey = new Map(missing.map((t) => [t.toolKey, t]));

  // Check which inserted tools already have policies (shouldn't happen, but be safe)
  const insertedIds = insertedRows.map((r) => r.id);
  const { data: existingPolicies, error: policyCheckError } = await admin
    .from("tenant_tool_policies")
    .select("tool_id")
    .eq("tenant_id", tenantId)
    .in("tool_id", insertedIds);

  if (policyCheckError) {
    throw new Error(`Failed to check existing policies: ${policyCheckError.message}`);
  }

  const existingPolicyIds = new Set(
    (existingPolicies || []).map((r: { tool_id: string }) => r.tool_id)
  );
  const needPolicies = insertedRows.filter((r) => !existingPolicyIds.has(r.id));

  if (needPolicies.length > 0) {
    const { error: policyInsertError } = await admin
      .from("tenant_tool_policies")
      .insert(
        needPolicies.map((r) => {
          const entry = entryByKey.get(r.tool_key);
          return {
            tenant_id: tenantId,
            customer_id: customerId,
            tool_id: r.id,
            approval_mode: entry?.defaultApprovalMode ?? "none",
            allow_roles: ALL_ROLES,
            max_calls_per_hour: 120,
            timeout_ms: 30000,
            metadata: { seeded_by: "native_tool_catalog" },
          };
        })
      );

    if (policyInsertError && policyInsertError.code !== "23505") {
      throw new Error(`Failed to seed tool policies: ${policyInsertError.message}`);
    }
  }

  seededTenants.add(tenantId);
  return { seeded: insertedRows.length };
}
