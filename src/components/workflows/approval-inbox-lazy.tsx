import dynamic from "next/dynamic";

const ApprovalInbox = dynamic(
  () =>
    import("@/components/workflows/approval-inbox").then(
      (m) => m.ApprovalInbox
    ),
  {
    loading: () => (
      <div className="rounded-2xl border border-border bg-bg-card/80 p-4 h-96 animate-pulse" />
    ),
  }
);

export { ApprovalInbox as ApprovalInboxLazy };
