import dynamic from "next/dynamic";

const RunTimeline = dynamic(
  () =>
    import("@/components/workflows/run-timeline").then(
      (m) => m.RunTimeline
    ),
  {
    loading: () => (
      <div className="rounded-2xl border border-border bg-bg-card/80 p-4 h-96 animate-pulse" />
    ),
  }
);

export { RunTimeline as RunTimelineLazy };
