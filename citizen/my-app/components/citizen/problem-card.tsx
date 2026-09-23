import Link from "next/link";
import { categoryLabels, categoryTone, statusLabels, statusTone, type CitizenProblem } from "@/lib/citizen";
import { CitizenIcon as Icon } from "@/components/citizen/icon";

export function ProblemCard({ problem, compact = false }: { problem: CitizenProblem; compact?: boolean }) {
  return <Link className={`citizen-problem-card ${compact ? "compact" : ""}`} href={`/citizen/problems/${problem.id}`}>
    <div className={`problem-symbol ${categoryTone[problem.category]}`}><Icon name={problem.category === "SAFETY" ? "shield" : problem.category === "TRANSPORT" ? "bus" : problem.category === "GREEN_SPACES" ? "leaf" : problem.category === "SOCIAL_INFRASTRUCTURE" ? "building" : "service"} size={20} /></div>
    <div className="problem-card-content"><div className="problem-card-top"><span className={`category-pill ${categoryTone[problem.category]}`}>{categoryLabels[problem.category]}</span><span className={`status-pill ${statusTone[problem.status]}`}><i />{statusLabels[problem.status]}</span></div><h3>{problem.title}</h3><p><Icon name="pin" size={13} /> {problem.locationLabel}</p><div className="problem-card-meta"><span><Icon name="user" size={14} /> {problem.confirmations} подтверждений</span><span>{problem.reportCount} сообщений</span></div></div><Icon name="arrow" size={17} className="problem-card-arrow" />
  </Link>;
}
