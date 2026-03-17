// ---------------------------------------------------------------------------
// Phase 7.1.3: Browser Automation Eval Scenarios
// Covers navigation, form fill, click, screenshot, budget exhaustion,
// SSRF protection, sensitive field blocking, and session management.
// ---------------------------------------------------------------------------

export interface BrowserEvalScenario {
  id: string;
  category:
    | "navigation"
    | "interaction"
    | "screenshot"
    | "budget"
    | "ssrf_protection"
    | "sensitive_fields"
    | "session_management"
    | "approval";
  description: string;
  setup: BrowserSetup;
  expected: BrowserExpectedOutcome;
}

export interface BrowserSetup {
  /** Which browser tool to invoke */
  tool: "browser_navigate" | "browser_extract" | "browser_click" | "browser_fill" | "browser_screenshot";
  args: Record<string, unknown>;
  /** Mock browser session state */
  sessionState?: {
    exists: boolean;
    quotaRemaining?: number;
    pageUrl?: string;
    pageTitle?: string;
  };
  /** Mock action result */
  mockResult?: {
    success: boolean;
    error?: string;
    pageState?: { url: string; title: string };
    extractedContent?: string;
    screenshotUrl?: string;
  };
  /** Approval policy for this action */
  approvalRequired?: boolean;
}

export interface BrowserExpectedOutcome {
  success: boolean;
  errorType?: string;
  /** Whether session should be created */
  sessionCreated?: boolean;
  /** Whether page state changed */
  pageStateChanged?: boolean;
  /** Whether approval was requested */
  approvalRequested?: boolean;
  /** Whether result includes extracted content */
  hasExtractedContent?: boolean;
  /** Whether result includes screenshot */
  hasScreenshot?: boolean;
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

export const BROWSER_EVAL_SCENARIOS: BrowserEvalScenario[] = [
  // --- Navigation ---
  {
    id: "browser-navigate-success",
    category: "navigation",
    description: "Navigate to HTTPS URL creates session and loads page",
    setup: {
      tool: "browser_navigate",
      args: { url: "https://example.com" },
      sessionState: { exists: false, quotaRemaining: 5 },
      mockResult: {
        success: true,
        pageState: { url: "https://example.com", title: "Example Domain" },
      },
    },
    expected: {
      success: true,
      sessionCreated: true,
      pageStateChanged: true,
    },
  },
  {
    id: "browser-navigate-reuses-session",
    category: "navigation",
    description: "Second navigation reuses existing session",
    setup: {
      tool: "browser_navigate",
      args: { url: "https://example.com/page2" },
      sessionState: { exists: true, pageUrl: "https://example.com" },
      mockResult: {
        success: true,
        pageState: { url: "https://example.com/page2", title: "Page 2" },
      },
    },
    expected: {
      success: true,
      sessionCreated: false,
      pageStateChanged: true,
    },
  },

  // --- Interaction ---
  {
    id: "browser-click-element",
    category: "interaction",
    description: "Click on a described element",
    setup: {
      tool: "browser_click",
      args: { element_description: "the blue Submit button" },
      sessionState: { exists: true, pageUrl: "https://example.com/form" },
      mockResult: {
        success: true,
        pageState: { url: "https://example.com/result", title: "Result" },
      },
    },
    expected: {
      success: true,
      pageStateChanged: true,
    },
  },
  {
    id: "browser-fill-form",
    category: "interaction",
    description: "Fill a form field with a value",
    setup: {
      tool: "browser_fill",
      args: { field_description: "the email address input", value: "test@example.com" },
      sessionState: { exists: true, pageUrl: "https://example.com/form" },
      mockResult: { success: true },
    },
    expected: {
      success: true,
    },
  },
  {
    id: "browser-extract-content",
    category: "interaction",
    description: "Extract structured data from page",
    setup: {
      tool: "browser_extract",
      args: { instruction: "Extract the pricing table", format: "json" },
      sessionState: { exists: true, pageUrl: "https://example.com/pricing" },
      mockResult: {
        success: true,
        extractedContent: JSON.stringify({ plans: [{ name: "Basic", price: "$10" }] }),
      },
    },
    expected: {
      success: true,
      hasExtractedContent: true,
    },
  },

  // --- Screenshot ---
  {
    id: "browser-screenshot-success",
    category: "screenshot",
    description: "Take a screenshot of the current page",
    setup: {
      tool: "browser_screenshot",
      args: { full_page: false },
      sessionState: { exists: true, pageUrl: "https://example.com" },
      mockResult: {
        success: true,
        screenshotUrl: "https://storage.example.com/screenshots/abc123.png",
      },
    },
    expected: {
      success: true,
      hasScreenshot: true,
    },
  },
  {
    id: "browser-screenshot-full-page",
    category: "screenshot",
    description: "Take a full-page screenshot",
    setup: {
      tool: "browser_screenshot",
      args: { full_page: true },
      sessionState: { exists: true, pageUrl: "https://example.com" },
      mockResult: {
        success: true,
        screenshotUrl: "https://storage.example.com/screenshots/full-abc123.png",
      },
    },
    expected: {
      success: true,
      hasScreenshot: true,
    },
  },

  // --- Budget ---
  {
    id: "browser-budget-exhaustion",
    category: "budget",
    description: "Session quota check blocks when no quota remaining",
    setup: {
      tool: "browser_navigate",
      args: { url: "https://example.com" },
      sessionState: { exists: false, quotaRemaining: 0 },
    },
    expected: {
      success: false,
      errorType: "quota_exceeded",
      sessionCreated: false,
    },
  },
  {
    id: "browser-action-budget-halt",
    category: "budget",
    description: "Guardrail browser action budget halts after exceeding limit",
    setup: {
      tool: "browser_click",
      args: { element_description: "button" },
      sessionState: { exists: true },
    },
    expected: {
      success: false,
      errorType: "budget_browser_actions",
    },
  },

  // --- SSRF protection ---
  {
    id: "browser-ssrf-localhost-blocked",
    category: "ssrf_protection",
    description: "Navigation to localhost is blocked",
    setup: {
      tool: "browser_navigate",
      args: { url: "http://localhost:8080/admin" },
      sessionState: { exists: true },
    },
    expected: {
      success: false,
      errorType: "ssrf_blocked",
    },
  },
  {
    id: "browser-ssrf-internal-ip-blocked",
    category: "ssrf_protection",
    description: "Navigation to private IP range is blocked",
    setup: {
      tool: "browser_navigate",
      args: { url: "http://192.168.1.1/admin" },
      sessionState: { exists: true },
    },
    expected: {
      success: false,
      errorType: "ssrf_blocked",
    },
  },
  {
    id: "browser-ssrf-metadata-blocked",
    category: "ssrf_protection",
    description: "Navigation to cloud metadata endpoint is blocked",
    setup: {
      tool: "browser_navigate",
      args: { url: "http://169.254.169.254/latest/meta-data/" },
      sessionState: { exists: true },
    },
    expected: {
      success: false,
      errorType: "ssrf_blocked",
    },
  },
  {
    id: "browser-auth-url-blocked",
    category: "ssrf_protection",
    description: "Navigation to login/auth pages is blocked",
    setup: {
      tool: "browser_navigate",
      args: { url: "https://accounts.google.com/signin" },
      sessionState: { exists: true },
    },
    expected: {
      success: false,
      errorType: "auth_url_blocked",
    },
  },

  // --- Sensitive fields ---
  {
    id: "browser-password-field-blocked",
    category: "sensitive_fields",
    description: "Filling a password field is blocked",
    setup: {
      tool: "browser_fill",
      args: { field_description: "the password input field", value: "secret123" },
      sessionState: { exists: true },
    },
    expected: {
      success: false,
      errorType: "sensitive_field",
    },
  },
  {
    id: "browser-credit-card-field-blocked",
    category: "sensitive_fields",
    description: "Filling a credit card number field is blocked",
    setup: {
      tool: "browser_fill",
      args: { field_description: "credit card number", value: "4111111111111111" },
      sessionState: { exists: true },
    },
    expected: {
      success: false,
      errorType: "sensitive_field",
    },
  },
  {
    id: "browser-ssn-field-blocked",
    category: "sensitive_fields",
    description: "Filling an SSN field is blocked",
    setup: {
      tool: "browser_fill",
      args: { field_description: "Social Security Number", value: "123-45-6789" },
      sessionState: { exists: true },
    },
    expected: {
      success: false,
      errorType: "sensitive_field",
    },
  },
  {
    id: "browser-normal-field-allowed",
    category: "sensitive_fields",
    description: "Filling a normal text field is allowed",
    setup: {
      tool: "browser_fill",
      args: { field_description: "company name", value: "Acme Corp" },
      sessionState: { exists: true },
      mockResult: { success: true },
    },
    expected: {
      success: true,
    },
  },

  // --- Session management ---
  {
    id: "browser-session-no-session-error",
    category: "session_management",
    description: "Actions without session return session_error",
    setup: {
      tool: "browser_click",
      args: { element_description: "button" },
      sessionState: { exists: false, quotaRemaining: 0 },
    },
    expected: {
      success: false,
      errorType: "session_error",
    },
  },

  // --- Approval ---
  {
    id: "browser-action-requires-approval",
    category: "approval",
    description: "Browser action blocked when approval is required",
    setup: {
      tool: "browser_navigate",
      args: { url: "https://example.com" },
      sessionState: { exists: true },
      approvalRequired: true,
    },
    expected: {
      success: false,
      approvalRequested: true,
    },
  },
];

export const BROWSER_SCENARIO_COUNTS = {
  total: BROWSER_EVAL_SCENARIOS.length,
  byCategory: Object.fromEntries(
    [
      "navigation",
      "interaction",
      "screenshot",
      "budget",
      "ssrf_protection",
      "sensitive_fields",
      "session_management",
      "approval",
    ].map((cat) => [
      cat,
      BROWSER_EVAL_SCENARIOS.filter((s) => s.category === cat).length,
    ])
  ) as Record<string, number>,
};
