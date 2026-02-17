const FEEDBACK_WINDOW_SECONDS = 60;
const FEEDBACK_MAX_ATTEMPTS = 20;

type DocsAskFeedbackSurface = "docs_modal" | "dashboard_help_modal";

function getDocsAskSurfaceRoute(surface: DocsAskFeedbackSurface): string {
  if (surface === "dashboard_help_modal") {
    return "/dashboard help modal";
  }

  return "/docs modal";
}

interface AuthUser {
  id: string;
}

interface DocsAskFeedbackClient {
  auth: {
    getUser: () => Promise<{ data: { user: AuthUser | null } }>;
  };
  from: (table: "customers") => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string
      ) => {
        single: () => Promise<{ data: { id: string } | null }>;
      };
    };
  };
}

interface DocsAskFeedbackAdminClient {
  from: (table: "telemetry_events") => {
    insert: (value: Record<string, unknown>) => Promise<{
      error: { code?: string; message: string } | null;
    }>;
  };
}

interface DocsAskFeedbackInput {
  query: string;
  helpful: boolean;
  sources: Array<{ title: string; slug: string }>;
  surface: DocsAskFeedbackSurface;
}

interface ParseResultSuccess {
  success: true;
  data: DocsAskFeedbackInput;
}

interface ParseResultFailure {
  success: false;
  details: unknown;
}

interface DocsAskFeedbackDeps {
  createClient: () => Promise<DocsAskFeedbackClient>;
  createAdminClient: () => DocsAskFeedbackAdminClient;
  consumeDurableRateLimit: (input: {
    action: string;
    key: string;
    windowSeconds: number;
    maxAttempts: number;
  }) => Promise<boolean>;
  parseInput: (input: unknown) => ParseResultSuccess | ParseResultFailure;
}

export function createDocsAskFeedbackHandler(deps: DocsAskFeedbackDeps) {
  return async function docsAskFeedbackPost(request: Request): Promise<Response> {
    const supabase = await deps.createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const feedbackAllowed = await deps.consumeDurableRateLimit({
      action: "docs_ask_feedback_user",
      key: user.id,
      windowSeconds: FEEDBACK_WINDOW_SECONDS,
      maxAttempts: FEEDBACK_MAX_ATTEMPTS,
    }).catch(() => null);

    if (feedbackAllowed === null) {
      return Response.json(
        { error: "Rate limiter unavailable. Please try again shortly." },
        { status: 503 }
      );
    }

    if (!feedbackAllowed) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = deps.parseInput(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.details },
        { status: 400 }
      );
    }

    const { query, helpful, sources, surface } = parsed.data;

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!customer) {
      return Response.json({ error: "Customer not found" }, { status: 404 });
    }

    const admin = deps.createAdminClient();

    const { error } = await admin.from("telemetry_events").insert({
      customer_id: customer.id,
      event_type: "docs_ask_feedback",
      tool_name: "docs_ask",
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost_cents: 0,
      metadata: {
        query,
        helpful,
        sources,
        surface,
        source_count: sources.length,
        user_agent: request.headers.get("user-agent") || null,
        route: getDocsAskSurfaceRoute(surface),
      },
    });

    if (error) {
      if (error.code === "42P01") {
        return Response.json({ ok: true }, { status: 202 });
      }

      console.error("[DOCS_ASK_FEEDBACK] telemetry insert error:", error.message);
      return Response.json(
        { error: "Failed to record feedback." },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  };
}
