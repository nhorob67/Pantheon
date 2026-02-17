import dynamic from "next/dynamic";

const WorkflowCreateForm = dynamic(
  () =>
    import("@/components/workflows/workflow-create-form").then(
      (m) => m.WorkflowCreateForm
    ),
  {
    loading: () => (
      <div className="rounded-2xl border border-border bg-bg-card/70 p-4 h-96 animate-pulse" />
    ),
  }
);

export { WorkflowCreateForm as WorkflowCreateFormLazy };
