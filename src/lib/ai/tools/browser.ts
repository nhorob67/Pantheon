import { tool, type Tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrowserSession } from "@/lib/runtime/browser-session";
import { createBrowserSession } from "@/lib/runtime/browser-session";
import { loadBrowserPolicy } from "@/lib/runtime/browser-policy";
import { checkBrowserSessionQuota } from "@/lib/runtime/browser-policy";
import { enqueueTenantApproval } from "@/lib/runtime/tenant-approvals";
import { buildTenantApprovalRequestHash } from "@/lib/runtime/tenant-approvals";
import type {
  BrowserActionResult,
  BrowserPolicy,
  BrowserSessionSummary,
} from "@/types/browser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToolMap = Record<string, Tool>;
const activeBrowserSessions = new Map<string, Promise<BrowserSession>>();

export interface BrowserToolConfig {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  agentId: string | null;
  runId: string;
}

// ---------------------------------------------------------------------------
// Result formatting
// ---------------------------------------------------------------------------

function formatResult(result: BrowserActionResult): Record<string, unknown> {
  if (!result.success && result.error) {
    return {
      error: result.error.class,
      message: result.error.message,
      retryable: result.error.retryable,
      page_state: result.pageState ?? null,
    };
  }
  return {
    ...result.output,
    page_state: result.pageState ?? null,
    artifacts: result.artifacts.map((a) => ({
      kind: a.kind,
      storage_key: a.storageKey,
    })),
  };
}

export async function flushBrowserSessionsForRun(
  runId: string
): Promise<BrowserSessionSummary[]> {
  const sessionPromise = activeBrowserSessions.get(runId);
  if (!sessionPromise) return [];

  activeBrowserSessions.delete(runId);

  try {
    const session = await sessionPromise;
    const durationMs = Math.max(0, Date.now() - session.state.startedAt);
    await session.close();

    return [
      {
        sessionId: session.state.id,
        actionCount: session.state.actionCount,
        durationMs,
        status: session.state.status,
        urlsVisited: [...session.state.urlsVisited],
        artifactCount: session.state.artifacts.length,
      },
    ];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

/**
 * Creates the 5 browser automation tools.
 * Lazily creates/reuses one BrowserSession per run.
 */
export function createBrowserTools(config: BrowserToolConfig): ToolMap {
  let sessionPromise: Promise<BrowserSession> | null = null;
  let sessionQuotaChecked = false;
  let resolvedPolicy: BrowserPolicy | null = null;
  const toolIdCache = new Map<string, string | null>();

  async function ensurePolicy(): Promise<BrowserPolicy> {
    if (resolvedPolicy) return resolvedPolicy;
    resolvedPolicy = await loadBrowserPolicy(config.admin, config.tenantId);
    return resolvedPolicy;
  }

  async function getBrowserToolId(toolKey: string): Promise<string | null> {
    if (toolIdCache.has(toolKey)) {
      return toolIdCache.get(toolKey) ?? null;
    }

    const { data } = await config.admin
      .from("tenant_tools")
      .select("id")
      .eq("tenant_id", config.tenantId)
      .eq("tool_key", toolKey)
      .maybeSingle();

    const toolId = typeof data?.id === "string" ? data.id : null;
    toolIdCache.set(toolKey, toolId);
    return toolId;
  }

  async function requestApprovalIfNeeded(
    toolKey: string,
    actionName: string,
    args: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    const policy = await ensurePolicy();
    if (!policy.requireApprovalActions?.includes(actionName)) {
      return null;
    }

    const existingSession = sessionPromise ? await sessionPromise.catch(() => null) : null;
    const pageState = existingSession?.getPageState() ?? null;
    const toolId = await getBrowserToolId(toolKey);
    const requestHashPayload = {
      kind: "browser_action",
      tenant_id: config.tenantId,
      run_id: config.runId,
      tool_key: toolKey,
      action: actionName,
      args,
      page_state: pageState,
    };
    const requestHash = buildTenantApprovalRequestHash(requestHashPayload);
    const { data: existingApproval } = await config.admin
      .from("tenant_approvals")
      .select("id, status, expires_at")
      .eq("tenant_id", config.tenantId)
      .eq("request_hash", requestHash)
      .maybeSingle();

    if (
      existingApproval?.status === "approved" &&
      (!existingApproval.expires_at || new Date(existingApproval.expires_at).getTime() > Date.now())
    ) {
      return null;
    }

    if (existingApproval?.status === "pending") {
      return {
        error: "approval_required",
        tool: toolKey,
        action: actionName,
        approval_id: existingApproval.id,
        message: `This browser action requires admin approval before it can proceed.`,
        remediation: "Review the pending approval in the approvals inbox, then retry the task after approval.",
        page_state: pageState,
      };
    }

    const { approvalId } = await enqueueTenantApproval(config.admin, {
      tenantId: config.tenantId,
      customerId: config.customerId,
      approvalType: "tool",
      requiredRole: "admin",
      toolId,
      requestHashPayload,
      requestPayload: {
        kind: "browser_action",
        tenant_id: config.tenantId,
        customer_id: config.customerId,
        run_id: config.runId,
        agent_id: config.agentId,
        tool_key: toolKey,
        action: actionName,
        args,
        session_id: existingSession?.state.id ?? null,
        page_state: pageState,
      },
    });

    return {
      error: "approval_required",
      tool: toolKey,
      action: actionName,
      approval_id: approvalId,
      message: `This browser action requires admin approval before it can proceed.`,
      remediation: "Review the pending approval in the approvals inbox, then retry the task after approval.",
      page_state: pageState,
    };
  }

  async function getOrCreateSession(): Promise<BrowserSession> {
    if (sessionPromise) return sessionPromise;

    sessionPromise = (async () => {
      // Check session quota before creating
      if (!sessionQuotaChecked) {
        const policy = await ensurePolicy();
        const quota = await checkBrowserSessionQuota(
          config.admin,
          config.tenantId,
          policy.maxSessionsPerDay
        );
        sessionQuotaChecked = true;

        if (!quota.allowed) {
          throw new Error(
            `Daily browser session limit reached (${quota.used}/${quota.limit}). Try again tomorrow.`
          );
        }

        return createBrowserSession({
          admin: config.admin,
          tenantId: config.tenantId,
          customerId: config.customerId,
          runId: config.runId,
          agentId: config.agentId,
          config: {
            maxActions: policy.maxActionsPerSession,
            maxDurationMs: policy.maxSessionDurationMs,
            domainAllowlist: policy.domainAllowlist,
            domainBlocklist: policy.domainBlocklist,
            baseCostCents: policy.baseCostCents,
            perActionCostCents: policy.perActionCostCents,
          },
        });
      }

      const policy = await ensurePolicy();
      return createBrowserSession({
        admin: config.admin,
        tenantId: config.tenantId,
        customerId: config.customerId,
        runId: config.runId,
        agentId: config.agentId,
        config: {
          maxActions: policy.maxActionsPerSession,
          maxDurationMs: policy.maxSessionDurationMs,
          domainAllowlist: policy.domainAllowlist,
          domainBlocklist: policy.domainBlocklist,
          baseCostCents: policy.baseCostCents,
          perActionCostCents: policy.perActionCostCents,
        },
      });
    })();
    activeBrowserSessions.set(config.runId, sessionPromise);
    sessionPromise.catch(() => {
      if (activeBrowserSessions.get(config.runId) === sessionPromise) {
        activeBrowserSessions.delete(config.runId);
      }
      sessionPromise = null;
    });

    return sessionPromise;
  }

  return {
    browser_navigate: tool({
      description:
        "Navigate to a URL in a headless browser. Use this to visit web pages for data extraction, " +
        "form submission, or portal access. Only HTTPS URLs are allowed. " +
        "After navigating, use browser_extract to read page content or browser_screenshot to capture the page.",
      inputSchema: z.object({
        url: z
          .string()
          .max(2048)
          .describe("The URL to navigate to (must be HTTPS)"),
      }),
      execute: async ({ url }) => {
        const denied = await requestApprovalIfNeeded("browser_navigate", "navigate", { url });
        if (denied) return denied;
        try {
          const session = await getOrCreateSession();
          const result = await session.navigate(url);
          return formatResult(result);
        } catch (err) {
          return { error: "session_error", message: err instanceof Error ? err.message : "Failed to create browser session" };
        }
      },
    }),

    browser_extract: tool({
      description:
        "Extract structured data from the current browser page. Reads the page's accessibility tree " +
        "and text content, then returns it in the requested format. Use after browser_navigate.",
      inputSchema: z.object({
        instruction: z
          .string()
          .max(500)
          .describe("What to extract from the page (e.g., 'extract the invoice total and date')"),
        format: z
          .enum(["json", "text", "table"])
          .default("json")
          .describe("Output format: 'json' for structured data, 'text' for plain text, 'table' for tabular data"),
      }),
      execute: async ({ instruction, format }) => {
        const denied = await requestApprovalIfNeeded("browser_extract", "extract", {
          instruction,
          format,
        });
        if (denied) return denied;
        try {
          const session = await getOrCreateSession();
          const result = await session.extract(instruction, format);
          return formatResult(result);
        } catch (err) {
          return { error: "session_error", message: err instanceof Error ? err.message : "No active browser session" };
        }
      },
    }),

    browser_click: tool({
      description:
        "Click an element on the current browser page. Describe the element naturally " +
        "(e.g., 'Submit button', 'Next page link', 'Accept cookies'). " +
        "Do NOT use CSS selectors — describe what the element looks like or says.",
      inputSchema: z.object({
        element_description: z
          .string()
          .max(300)
          .describe("Natural language description of the element to click"),
      }),
      execute: async ({ element_description }) => {
        const denied = await requestApprovalIfNeeded("browser_click", "click", {
          element_description,
        });
        if (denied) return denied;
        try {
          const session = await getOrCreateSession();
          const result = await session.click(element_description);
          return formatResult(result);
        } catch (err) {
          return { error: "session_error", message: err instanceof Error ? err.message : "No active browser session" };
        }
      },
    }),

    browser_fill: tool({
      description:
        "Fill a form field on the current browser page. Describe the field naturally " +
        "(e.g., 'Email address', 'Search box', 'Company name'). " +
        "Password and payment fields are not allowed. Do NOT use CSS selectors.",
      inputSchema: z.object({
        field_description: z
          .string()
          .max(300)
          .describe("Natural language description of the form field to fill"),
        value: z
          .string()
          .max(1000)
          .describe("The value to enter into the field"),
      }),
      execute: async ({ field_description, value }) => {
        const denied = await requestApprovalIfNeeded("browser_fill", "fill", {
          field_description,
          value_preview: value.slice(0, 100),
          value_length: value.length,
        });
        if (denied) return denied;
        try {
          const session = await getOrCreateSession();
          const result = await session.fill(field_description, value);
          return formatResult(result);
        } catch (err) {
          return { error: "session_error", message: err instanceof Error ? err.message : "No active browser session" };
        }
      },
    }),

    browser_screenshot: tool({
      description:
        "Take a screenshot of the current browser page. The screenshot is stored and " +
        "can be viewed in the run inspector. Use this to capture visual state for verification.",
      inputSchema: z.object({
        full_page: z
          .boolean()
          .default(false)
          .describe("Capture the full scrollable page (true) or just the visible viewport (false)"),
      }),
      execute: async ({ full_page }) => {
        const denied = await requestApprovalIfNeeded("browser_screenshot", "screenshot", {
          full_page,
        });
        if (denied) return denied;
        try {
          const session = await getOrCreateSession();
          const result = await session.screenshot(full_page);
          return formatResult(result);
        } catch (err) {
          return { error: "session_error", message: err instanceof Error ? err.message : "No active browser session" };
        }
      },
    }),
  };
}
