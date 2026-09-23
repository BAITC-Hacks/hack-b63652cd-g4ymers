import { CitizenIcon } from "@/components/citizen/icon";
import { CitizenStatus, statusLabels } from "@/lib/citizen";

const steps: CitizenStatus[] = ["NEW", "UNDER_REVIEW", "PLANNED", "IN_PROGRESS", "RESOLVED"];

export function StatusTimeline({ status }: { status: CitizenStatus }) {
  const activeIndex = Math.max(0, steps.indexOf(status));
  return <div className="citizen-timeline" aria-label={`Статус обращения: ${statusLabels[status]}`}>
    {steps.map((step, index) => <div className={`timeline-step ${index <= activeIndex ? "done" : ""} ${step === status ? "current" : ""}`} key={step}>
      <span className="timeline-dot">{index < activeIndex ? <CitizenIcon name="check" size={13} /> : <i />}</span>
      <span>{statusLabels[step]}</span>
      {index < steps.length - 1 && <b />}
    </div>)}
  </div>;
}
