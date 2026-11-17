export const columns = [
  { id: "REVIEW", label: "À valider" },
  { id: "TODO", label: "À traiter" },
  { id: "IN_PROGRESS", label: "En cours" },
  { id: "RESOLVED", label: "Résolu" },
] as const;
export type Status = (typeof columns)[number]["id"];
export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type Team = { id: string; name: string };
export type Proposal = {
  id: string;
  proposed_priority: Priority | null;
  proposed_team_id: string | null;
  proposed_status: Status | null;
  intent: string;
  rationale: string;
  confidence: number;
  state: string;
  base_version: number;
  agent_run_id: string;
};
export type Source = {
  chunk_id: string;
  document_id: string;
  title: string;
  source: string;
  snippet: string;
  version: number;
};
export type Draft = {
  id: string;
  body: string;
  sources: Source[];
  state: string;
};
export type Ticket = {
  id: string;
  public_ref: string;
  requester_name: string;
  subject: string;
  status: Status;
  priority: Priority;
  priority_rank: number;
  position: number;
  intent: string | null;
  team_id: string | null;
  analysis_state: string;
  ai_confidence: number | null;
  approval_state: string;
  human_locked_fields: string[];
  version: number;
  salesforce_case_id: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
};
export type Detail = Ticket & {
  description: string;
  requester_email: string;
  proposals: Proposal[];
  drafts: Draft[];
  audit: {
    id: string;
    actor_type: string;
    action: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    reason: string;
    run_id: string | null;
    occurred_at: string;
  }[];
};
