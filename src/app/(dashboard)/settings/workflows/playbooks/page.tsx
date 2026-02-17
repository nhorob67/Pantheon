import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDashboardCustomer, getCustomerInstance } from "@/lib/auth/dashboard-session";
import { listWorkflowPlaybookCatalog } from "@/lib/workflows/playbooks";
import { isWorkflowBuilderEnabledForCustomer } from "@/lib/workflows/feature-gate";

export default async function WorkflowPlaybooksPage() {
  const { customerId } = await requireDashboardCustomer();
  const admin = createAdminClient();
  const workflowBuilderEnabled = await isWorkflowBuilderEnabledForCustomer(
    admin,
    customerId
  );

  if (!workflowBuilderEnabled) {
    notFound();
  }

  const instance = await getCustomerInstance(customerId);

  if (!instance) {
    return (
      <div className="space-y-2">
        <h3 className="font-headline text-lg font-semibold text-text-primary">
          Workflow Playbooks
        </h3>
        <p className="text-sm text-text-dim">
          Provision your instance first before browsing and installing playbooks.
        </p>
      </div>
    );
  }

  const playbooks = await listWorkflowPlaybookCatalog(admin, {
    customerId,
    includeOwned: true,
    limit: 60,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-headline text-lg font-semibold text-text-primary">
            Workflow Playbooks
          </h3>
          <p className="text-sm text-text-dim">
            Install reusable marketplace workflows or publish your own from builder.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings/workflows"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
          >
            Back to workflows
          </Link>
          <Link
            href="/settings/workflows/new?source=playbook"
            className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg-deep transition-colors hover:bg-accent-light"
          >
            Install playbook
          </Link>
        </div>
      </div>

      {playbooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-text-dim">
          No playbooks available yet. Publish one from a workflow builder draft first.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {playbooks.map((playbook) => (
            <article
              key={playbook.id}
              className="rounded-xl border border-border bg-bg-card/70 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">{playbook.name}</h4>
                  <p className="mt-1 text-xs text-text-dim">/{playbook.slug}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-text-dim">
                  v{playbook.latest_version}
                </span>
              </div>

              <p className="mt-2 text-xs text-text-secondary">
                {playbook.summary || playbook.description || "No summary provided."}
              </p>

              <p className="mt-2 text-[11px] uppercase tracking-wide text-amber-300/90">
                {playbook.category || "general"} • {playbook.install_count} installs
              </p>

              <p className="mt-2 text-[11px] text-text-dim">
                {playbook.status} • {playbook.visibility}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <Link
                  href={`/settings/workflows/new?source=playbook&playbook_id=${playbook.id}`}
                  className="rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
                >
                  Install from create flow
                </Link>
                {playbook.source_workflow_id && playbook.customer_id === customerId && (
                  <Link
                    href={`/settings/workflows/${playbook.source_workflow_id}`}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
                  >
                    Open source workflow
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
