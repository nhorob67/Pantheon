import dynamic from "next/dynamic";

const WorkflowBuilderShell = dynamic(
  () =>
    import("@/components/workflows/workflow-builder-shell").then(
      (m) => m.WorkflowBuilderShell
    ),
  {
    loading: () => (
      <div className="rounded-2xl border border-border bg-bg-card/70 p-4 h-[600px] animate-pulse" />
    ),
  }
);

export { WorkflowBuilderShell as WorkflowBuilderShellLazy };
