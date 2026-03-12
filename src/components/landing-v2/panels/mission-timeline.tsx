interface TimelineStep {
  num: string;
  title: string;
  description: string;
}

interface MissionTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export function MissionTimeline({ steps, className }: MissionTimelineProps) {
  return (
    <div className={`v2-war-room-steps ${className ?? ""}`}>
      {steps.map((step) => (
        <div key={step.num} className="v2-war-room-step">
          <div className="v2-war-room-step-num">Phase {step.num}</div>
          <div className="v2-war-room-step-title">{step.title}</div>
          <div className="v2-war-room-step-desc">{step.description}</div>
        </div>
      ))}
    </div>
  );
}
