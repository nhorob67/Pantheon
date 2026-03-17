import { generateObject, generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  BrowserSessionConfig,
  BrowserSessionState,
  BrowserActionResult,
  BrowserErrorClass,
  BrowserArtifact,
} from "@/types/browser";
import { DEFAULT_BROWSER_SESSION_CONFIG } from "@/types/browser";
import { isBlockedHost, checkDomainPolicy, isAuthUrl, isSensitiveField } from "@/lib/security/network-guard";
import { AI_CONFIG, pantheonFastModel } from "@/lib/ai/client";
import { storeBrowserArtifact } from "./browser-artifacts";
import { recordBrowserSessionCost } from "@/lib/ai/usage-tracker";

// ---------------------------------------------------------------------------
// Browser Session Manager
// ---------------------------------------------------------------------------

export interface BrowserSessionCreateOpts {
  admin: SupabaseClient;
  tenantId: string;
  customerId: string;
  runId: string;
  agentId: string | null;
  config?: Partial<BrowserSessionConfig>;
}

export interface BrowserSession {
  readonly state: BrowserSessionState;
  navigate(url: string): Promise<BrowserActionResult>;
  extract(instruction: string, format: "json" | "text" | "table"): Promise<BrowserActionResult>;
  click(elementDescription: string): Promise<BrowserActionResult>;
  fill(fieldDescription: string, value: string): Promise<BrowserActionResult>;
  screenshot(fullPage: boolean): Promise<BrowserActionResult>;
  getPageState(): { url: string; title: string; hasContent: boolean } | null;
  close(): Promise<void>;
}

/**
 * Create a headless browser session using Playwright.
 * Each session gets an isolated BrowserContext (separate cookies/storage).
 */
export async function createBrowserSession(
  opts: BrowserSessionCreateOpts
): Promise<BrowserSession> {
  const config: BrowserSessionConfig = {
    ...DEFAULT_BROWSER_SESSION_CONFIG,
    ...opts.config,
  };

  // Dynamic import to avoid pulling Playwright into bundles that don't need it
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Pantheon/1.0 (browser-automation)",
    viewport: { width: 1280, height: 720 },
    locale: "en-US",
  });
  const page = await context.newPage();

  // Create session record in DB
  const { data: sessionRow, error: sessionError } = await opts.admin
    .from("tenant_browser_sessions")
    .insert({
      tenant_id: opts.tenantId,
      customer_id: opts.customerId,
      run_id: opts.runId,
      agent_id: opts.agentId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sessionError || !sessionRow) {
    await context.close();
    await browser.close();
    throw new Error(`Failed to create browser session: ${sessionError?.message ?? "unknown"}`);
  }

  const state: BrowserSessionState = {
    id: sessionRow.id,
    tenantId: opts.tenantId,
    customerId: opts.customerId,
    runId: opts.runId,
    agentId: opts.agentId,
    status: "active",
    currentUrl: null,
    currentTitle: null,
    urlsVisited: [],
    actionCount: 0,
    artifacts: [],
    startedAt: Date.now(),
    costCents: config.baseCostCents,
  };

  let closed = false;

  // Hard timeout — close after max duration
  const timeoutHandle = setTimeout(async () => {
    if (!closed) {
      state.status = "timed_out";
      await finalizeSession();
    }
  }, config.maxDurationMs);

  async function finalizeSession(): Promise<void> {
    if (closed) return;
    closed = true;
    clearTimeout(timeoutHandle);

    try {
      await context.close();
      await browser.close();
    } catch {
      // best-effort cleanup
    }

    await opts.admin
      .from("tenant_browser_sessions")
      .update({
        status: state.status,
        action_count: state.actionCount,
        current_url: state.currentUrl,
        cost_cents: state.costCents,
        completed_at: new Date().toISOString(),
      })
      .eq("id", state.id);

    // Record session cost to api_usage for billing
    await recordBrowserSessionCost(opts.admin, opts.customerId, state.costCents).catch((err: unknown) => {
      console.error("[browser-session] Failed to record session cost:", err instanceof Error ? err.message : "unknown");
    });
  }

  function checkBudget(): BrowserActionResult | null {
    if (closed || state.status === "timed_out") {
      return makeError("budget_exceeded", "Browser session has ended (timed out).", false);
    }
    if (state.actionCount >= config.maxActions) {
      return makeError("budget_exceeded", `Action limit reached (${config.maxActions} max).`, false);
    }
    const elapsed = Date.now() - state.startedAt;
    if (elapsed >= config.maxDurationMs) {
      state.status = "timed_out";
      return makeError("budget_exceeded", `Session duration limit reached (${config.maxDurationMs}ms).`, false);
    }
    return null;
  }

  function makeError(
    errorClass: BrowserErrorClass,
    message: string,
    retryable: boolean,
    pageState?: { url: string; title: string; hasContent: boolean } | null,
    artifacts: BrowserArtifact[] = []
  ): BrowserActionResult {
    if (state.status === "active" && errorClass !== "budget_exceeded") {
      state.status = "failed";
    }
    if (state.status === "active" && errorClass === "budget_exceeded") {
      state.status = "failed";
    }
    return {
      success: false,
      output: {},
      artifacts,
      error: { class: errorClass, message, retryable },
      pageState: pageState ?? undefined,
    };
  }

  function incrementAction(): number {
    const actionCostCents =
      state.actionCount === 0
        ? config.baseCostCents + config.perActionCostCents
        : config.perActionCostCents;
    state.actionCount++;
    state.costCents += config.perActionCostCents;
    return actionCostCents;
  }

  function rememberPage(url: string | null, title: string | null = state.currentTitle): void {
    state.currentUrl = url;
    state.currentTitle = title;
    if (url && !state.urlsVisited.includes(url)) {
      state.urlsVisited.push(url);
    }
  }

  function validateUrlAgainstPolicy(url: string): string | null {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return "Invalid URL format.";
    }

    if (parsedUrl.protocol !== "https:") {
      return "Only HTTPS URLs are allowed.";
    }

    if (isBlockedHost(parsedUrl.hostname)) {
      return "Requests to internal/private networks are not allowed.";
    }

    return checkDomainPolicy(
      parsedUrl.hostname,
      config.domainAllowlist,
      config.domainBlocklist
    );
  }

  function requireLoadedPage(): BrowserActionResult | null {
    const currentUrl = page.url();
    if (!currentUrl || currentUrl === "about:blank") {
      return makeError(
        "site_breakage",
        "No active browser page. Navigate to a page before using this action.",
        false
      );
    }

    const domainCheck = validateUrlAgainstPolicy(currentUrl);
    if (domainCheck) {
      rememberPage(currentUrl);
      return makeError("policy_denial", domainCheck, false, {
        url: currentUrl,
        title: state.currentTitle ?? "",
        hasContent: true,
      });
    }

    rememberPage(currentUrl);
    return null;
  }

  async function storeJsonArtifact(
    kind: "dom_snapshot" | "structured_output" | "step_log",
    payload: Record<string, unknown>,
    actionIndex: number
  ): Promise<BrowserArtifact> {
    const artifact = await storeBrowserArtifact(opts.admin, {
      sessionId: state.id,
      tenantId: opts.tenantId,
      customerId: opts.customerId,
      kind,
      data: Buffer.from(JSON.stringify(payload, null, 2), "utf8"),
      contentType: "application/json",
      actionIndex,
      metadata: {
        url: page.url(),
      },
    });

    state.artifacts.push(artifact);
    return artifact;
  }

  async function extractStructuredData(
    instruction: string,
    format: "json" | "text" | "table",
    title: string,
    pageUrl: string,
    pageContent: string,
    snapshot: unknown
  ): Promise<Record<string, unknown>> {
    const extractionContext = [
      `Page title: ${title}`,
      `Page URL: ${pageUrl}`,
      `Instruction: ${instruction}`,
      "",
      "Visible page text:",
      pageContent.slice(0, 8000),
      "",
      "Accessibility snapshot:",
      typeof snapshot === "string" ? snapshot.slice(0, 4000) : JSON.stringify(snapshot ?? {}).slice(0, 4000),
    ].join("\n");

    if (format === "text") {
      const { text } = await generateText({
        model: pantheonFastModel,
        maxOutputTokens: Math.min(1024, AI_CONFIG.maxOutputTokens),
        temperature: 0,
        system:
          "Extract only the information needed to satisfy the instruction. " +
          "Respond with concise plain text grounded in the supplied page content.",
        prompt: extractionContext,
      });

      return {
        page_title: title,
        page_url: pageUrl,
        extracted_text: text.trim(),
      };
    }

    if (format === "table") {
      const { object } = await generateObject({
        model: pantheonFastModel,
        schema: z.object({
          columns: z.array(z.string()).max(12),
          rows: z.array(z.array(z.string()).max(12)).max(50),
          summary: z.string(),
        }),
        temperature: 0,
        system:
          "Extract the requested information as a table. " +
          "Leave columns/rows empty if the page does not contain the requested table-like data.",
        prompt: extractionContext,
      });

      return {
        page_title: title,
        page_url: pageUrl,
        columns: object.columns,
        rows: object.rows,
        summary: object.summary,
      };
    }

    const { object } = await generateObject({
      model: pantheonFastModel,
      schema: z.object({
        summary: z.string(),
        fields: z.array(z.object({
          name: z.string(),
          value: z.string(),
          confidence: z.enum(["high", "medium", "low"]),
        })).max(25),
      }),
      temperature: 0,
      system:
        "Extract only the data needed to satisfy the instruction. " +
        "Return grounded fields with confidence levels. Do not invent missing values.",
      prompt: extractionContext,
    });

    return {
      page_title: title,
      page_url: pageUrl,
      summary: object.summary,
      fields: object.fields,
    };
  }

  const session: BrowserSession = {
    get state() {
      return state;
    },

    async navigate(url: string): Promise<BrowserActionResult> {
      const budgetCheck = checkBudget();
      if (budgetCheck) return budgetCheck;

      const domainCheck = validateUrlAgainstPolicy(url);
      if (domainCheck) {
        return makeError("policy_denial", domainCheck, false);
      }

      const parsedUrl = new URL(url);

      const actionCostCents = incrementAction();

      try {
        const response = await page.goto(parsedUrl.toString(), {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });

        const title = await page.title();
        rememberPage(page.url(), title);

        const finalUrlCheck = validateUrlAgainstPolicy(page.url());
        if (finalUrlCheck) {
          return makeError("policy_denial", finalUrlCheck, false, {
            url: page.url(),
            title,
            hasContent: true,
          });
        }

        if (!response || response.status() >= 400) {
          return makeError(
            "site_breakage",
            `Navigation failed with HTTP ${response?.status() ?? "unknown"}.`,
            response?.status() === 429 || (response?.status() ?? 0) >= 500,
            {
              url: page.url(),
              title,
              hasContent: true,
            }
          );
        }

        const authDetected = isAuthUrl(page.url());
        const stepArtifact = await storeJsonArtifact("step_log", {
          action: "navigate",
          requested_url: url,
          final_url: page.url(),
          title,
          status: response.status(),
          auth_page_detected: authDetected,
        }, state.actionCount);

        if (authDetected) {
          return makeError(
            "auth_failure",
            "Navigation reached an authentication page. Browser automation cannot complete login or credential entry.",
            false,
            {
              url: page.url(),
              title,
              hasContent: true,
            },
            [stepArtifact]
          );
        }

        return {
          success: true,
          output: {
            session_id: state.id,
            url: page.url(),
            title,
            status: response.status(),
            auth_page_detected: authDetected,
            artifact_count: state.artifacts.length,
            action_cost_cents: actionCostCents,
            session_cost_cents: state.costCents,
          },
          artifacts: [stepArtifact],
          pageState: {
            url: page.url(),
            title,
            hasContent: true,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Navigation failed";
        return makeError("site_breakage", message, true, {
          url: page.url() || parsedUrl.toString(),
          title: state.currentTitle ?? "",
          hasContent: Boolean(page.url()),
        });
      }
    },

    async extract(instruction: string, format: "json" | "text" | "table"): Promise<BrowserActionResult> {
      const budgetCheck = checkBudget();
      if (budgetCheck) return budgetCheck;
      const pageCheck = requireLoadedPage();
      if (pageCheck) return pageCheck;

      const actionCostCents = incrementAction();

      try {
        // Use aria snapshot for structured extraction
        const snapshot = await page.locator("body").ariaSnapshot().catch(() => null);
        const pageContent = await page.textContent("body").catch(() => null);
        const title = await page.title();
        rememberPage(page.url(), title);
        const extracted = await extractStructuredData(
          instruction,
          format,
          title,
          page.url(),
          pageContent?.slice(0, 8000) ?? "",
          snapshot
        );
        const domArtifact = await storeJsonArtifact("dom_snapshot", {
          page_url: page.url(),
          page_title: title,
          accessibility_tree: snapshot,
          text_content: pageContent?.slice(0, 8000) ?? "",
        }, state.actionCount);
        const structuredArtifact = await storeJsonArtifact("structured_output", extracted, state.actionCount);

        return {
          success: true,
          output: {
            session_id: state.id,
            instruction,
            format,
            ...extracted,
            artifact_count: state.artifacts.length,
            action_cost_cents: actionCostCents,
            session_cost_cents: state.costCents,
          },
          artifacts: [domArtifact, structuredArtifact],
          pageState: {
            url: page.url(),
            title,
            hasContent: !!pageContent,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Extraction failed";
        return makeError("site_breakage", message, true, {
          url: page.url(),
          title: state.currentTitle ?? "",
          hasContent: true,
        });
      }
    },

    async click(elementDescription: string): Promise<BrowserActionResult> {
      const budgetCheck = checkBudget();
      if (budgetCheck) return budgetCheck;
      const pageCheck = requireLoadedPage();
      if (pageCheck) return pageCheck;

      const actionCostCents = incrementAction();

      try {
        // Use getByRole/getByText for accessibility-driven interaction
        const element = page.getByRole("button", { name: elementDescription })
          .or(page.getByRole("link", { name: elementDescription }))
          .or(page.getByText(elementDescription, { exact: false }));

        const count = await element.count();
        if (count === 0) {
          return makeError(
            "selector_failure",
            `No element found matching "${elementDescription}".`,
            false
          );
        }
        if (count > 3) {
          return makeError(
            "selector_failure",
            `Multiple elements (${count}) match "${elementDescription}". Be more specific.`,
            false
          );
        }

        await element.first().click({ timeout: 10_000 });
        // Wait for any navigation triggered by click
        await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});

        rememberPage(page.url());
        const finalUrlCheck = validateUrlAgainstPolicy(page.url());
        if (finalUrlCheck) {
          return makeError("policy_denial", finalUrlCheck, false, {
            url: page.url(),
            title: state.currentTitle ?? "",
            hasContent: true,
          });
        }
        const title = await page.title();
        rememberPage(page.url(), title);
        const stepArtifact = await storeJsonArtifact("step_log", {
          action: "click",
          element_description: elementDescription,
          current_url: page.url(),
          title,
        }, state.actionCount);

        return {
          success: true,
          output: {
            session_id: state.id,
            clicked: elementDescription,
            current_url: page.url(),
            title,
            artifact_count: state.artifacts.length,
            action_cost_cents: actionCostCents,
            session_cost_cents: state.costCents,
          },
          artifacts: [stepArtifact],
          pageState: {
            url: page.url(),
            title,
            hasContent: true,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Click failed";
        return makeError("selector_failure", message, false, {
          url: page.url(),
          title: state.currentTitle ?? "",
          hasContent: true,
        });
      }
    },

    async fill(fieldDescription: string, value: string): Promise<BrowserActionResult> {
      const budgetCheck = checkBudget();
      if (budgetCheck) return budgetCheck;
      const pageCheck = requireLoadedPage();
      if (pageCheck) return pageCheck;

      // Check for sensitive fields
      if (isSensitiveField(fieldDescription)) {
        return makeError(
          "policy_denial",
          `Cannot fill sensitive field "${fieldDescription}". Password and payment fields are not allowed.`,
          false
        );
      }

      const actionCostCents = incrementAction();

      try {
        const field = page.getByRole("textbox", { name: fieldDescription })
          .or(page.getByLabel(fieldDescription, { exact: false }))
          .or(page.getByPlaceholder(fieldDescription, { exact: false }));

        const count = await field.count();
        if (count === 0) {
          return makeError(
            "selector_failure",
            `No form field found matching "${fieldDescription}".`,
            false
          );
        }

        await field.first().fill(value, { timeout: 10_000 });

        const title = await page.title();
        rememberPage(page.url(), title);
        const finalUrlCheck = validateUrlAgainstPolicy(page.url());
        if (finalUrlCheck) {
          return makeError("policy_denial", finalUrlCheck, false, {
            url: page.url(),
            title,
            hasContent: true,
          });
        }
        const stepArtifact = await storeJsonArtifact("step_log", {
          action: "fill",
          field_description: fieldDescription,
          value_length: value.length,
          current_url: page.url(),
          title,
        }, state.actionCount);

        return {
          success: true,
          output: {
            session_id: state.id,
            filled: fieldDescription,
            value_length: value.length,
            current_url: page.url(),
            artifact_count: state.artifacts.length,
            action_cost_cents: actionCostCents,
            session_cost_cents: state.costCents,
          },
          artifacts: [stepArtifact],
          pageState: {
            url: page.url(),
            title,
            hasContent: true,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Fill failed";
        return makeError("selector_failure", message, false, {
          url: page.url(),
          title: state.currentTitle ?? "",
          hasContent: true,
        });
      }
    },

    async screenshot(fullPage: boolean): Promise<BrowserActionResult> {
      const budgetCheck = checkBudget();
      if (budgetCheck) return budgetCheck;
      const pageCheck = requireLoadedPage();
      if (pageCheck) return pageCheck;

      const actionCostCents = incrementAction();

      try {
        const screenshotBuffer = await page.screenshot({
          fullPage,
          type: "png",
        });

        const artifact = await storeBrowserArtifact(opts.admin, {
          sessionId: state.id,
          tenantId: opts.tenantId,
          customerId: opts.customerId,
          kind: "screenshot",
          data: screenshotBuffer,
          contentType: "image/png",
          actionIndex: state.actionCount,
          metadata: { url: page.url(), fullPage },
        });

        state.artifacts.push(artifact);
        const title = await page.title();
        rememberPage(page.url(), title);

        return {
          success: true,
          output: {
            session_id: state.id,
            screenshot_taken: true,
            storage_key: artifact.storageKey,
            url: page.url(),
            full_page: fullPage,
            artifact_count: state.artifacts.length,
            action_cost_cents: actionCostCents,
            session_cost_cents: state.costCents,
          },
          artifacts: [artifact],
          pageState: {
            url: page.url(),
            title,
            hasContent: true,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Screenshot failed";
        return makeError("site_breakage", message, true, {
          url: page.url(),
          title: state.currentTitle ?? "",
          hasContent: true,
        });
      }
    },

    getPageState() {
      if (closed || !state.currentUrl) return null;
      return {
        url: state.currentUrl,
        title: state.currentTitle ?? "",
        hasContent: true,
      };
    },

    async close(): Promise<void> {
      if (state.status === "active") {
        state.status = "completed";
      }
      await finalizeSession();
    },
  };

  return session;
}
