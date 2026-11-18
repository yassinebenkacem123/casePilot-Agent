import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalysisBadge({ state }: { state: string }) {
  const normalized = state.toUpperCase();
  if (normalized === "PENDING_ANALYSIS" || normalized === "RUNNING") {
    return (
      <span className="ai-pill ai-pill-running">
        <Loader2 size={12} className="spin" />
        AI analyzing request
      </span>
    );
  }
  if (normalized === "FAILED" || normalized === "ERROR") {
    return (
      <span className="ai-pill ai-pill-error">
        <AlertTriangle size={12} />
        Agent error
      </span>
    );
  }
  if (normalized === "COMPLETED") {
    return (
      <span className="ai-pill ai-pill-done">
        <Sparkles size={12} />
        Analysis ready
      </span>
    );
  }
  return (
    <span className="ai-pill">
      <Bot size={12} />
      {state.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}

export function ApprovalBadge({ state }: { state: string }) {
  const normalized = state.toUpperCase();
  if (normalized === "APPROVED") {
    return (
      <span className="approval-pill approval-approved">
        <ShieldCheck size={12} />
        Approved
      </span>
    );
  }
  if (normalized === "REJECTED") {
    return (
      <span className="approval-pill approval-rejected">
        <XCircle size={12} />
        Rejected
      </span>
    );
  }
  return (
    <span className="approval-pill approval-pending">
      <Clock size={12} />
      Awaiting approval
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const lower = priority.toLowerCase();
  return (
    <span className={cn("badge", `priority-${lower}`)}>
      <span className="priority-dot" aria-hidden="true" />
      {lower}
    </span>
  );
}

export function AgentStepList({
  analysisState,
  hasIntent,
  hasProposal,
  hasSources,
  approvalState,
}: {
  analysisState: string;
  hasIntent: boolean;
  hasProposal: boolean;
  hasSources: boolean;
  approvalState: string;
}) {
  const isAnalyzing =
    analysisState === "PENDING_ANALYSIS" || analysisState === "RUNNING";
  const isFailed = analysisState === "FAILED" || analysisState === "ERROR";
  const isApproved = approvalState === "APPROVED";

  const steps = [
    {
      label: isAnalyzing ? "AI analyzing request…" : "Intent detected",
      done: !isAnalyzing && !isFailed && hasIntent,
      active: isAnalyzing,
      error: isFailed,
    },
    {
      label: "Priority & team suggested",
      done: !isAnalyzing && !isFailed && hasProposal,
      active: false,
      error: false,
    },
    {
      label: "Knowledge retrieved",
      done: hasSources,
      active: false,
      error: false,
    },
    {
      label: isApproved ? "Action approved" : "Awaiting human approval",
      done: isApproved,
      active: !isApproved && hasProposal,
      error: false,
    },
  ];

  return (
    <div className="agent-steps" aria-label="AI agent pipeline status">
      {steps.map((step) => (
        <div
          key={step.label}
          className={cn(
            "agent-step",
            step.done && "is-done",
            step.active && "is-active",
            step.error && "is-error",
          )}
        >
          {step.error ? (
            <AlertTriangle size={12} />
          ) : step.done ? (
            <CheckCircle2 size={12} />
          ) : step.active ? (
            <Loader2 size={12} className="spin" />
          ) : (
            <Clock size={12} />
          )}
          <span>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

