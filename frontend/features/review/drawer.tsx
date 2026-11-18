"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  CloudUpload,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  AgentStepList,
  AnalysisBadge,
  ApprovalBadge,
  PriorityBadge,
} from "@/components/ui/ai-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { Detail, Priority, Team } from "@/lib/types";

export function TicketDrawer({
  ticketId,
  close,
  teams,
}: {
  ticketId: string | null;
  close: () => void;
  teams: Team[];
}) {
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const detail = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => api<Detail>(`tickets/${ticketId}`),
    enabled: !!ticketId,
    refetchInterval: 5000,
  });

  const t = detail.data;

  async function action(
    path: string,
    body: Record<string, unknown> = {},
    method = "POST",
  ) {
    setBusy(true);
    setError("");
    try {
      await api(path, {
        method,
        body: JSON.stringify({
          expected_version: t?.version,
          ...(path.endsWith("salesforce-sync") ? { approved: true } : {}),
          ...body,
        }),
      });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      await client.invalidateQueries();
      setBusy(false);
    }
  }

  const proposal = t?.proposals.find((p) => p.state === "PENDING");
  const effectivePriority = proposal?.proposed_priority ?? t?.priority;
  const effectiveTeamId = proposal?.proposed_team_id ?? t?.team_id ?? "";
  const hasSources = Boolean(t?.drafts.some((d) => d.sources.length > 0));

  return (
    <Dialog
      open={!!ticketId}
      onOpenChange={(open) => {
        if (!open) {
          setError("");
          close();
        }
      }}
    >
      <DialogContent>
        <div className="drawer-header">
          {t && (
            <div className="drawer-badges">
              <span className="ticket-ref">{t.public_ref}</span>
              <PriorityBadge priority={proposal?.proposed_priority ?? t.priority} />
              <AnalysisBadge state={t.analysis_state} />
              <ApprovalBadge state={t.approval_state} />
            </div>
          )}
          <DialogTitle>{t?.subject || "Loading ticket…"}</DialogTitle>
          <DialogDescription>
            {t?.public_ref || "Ticket detail"} · Confirm the AI triage or change
            priority and team below.
          </DialogDescription>
        </div>

        {detail.error && (
          <p className="error" role="alert">
            {detail.error.message}
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {t && (
          <>
            {/* Quick Confirm or Change bar */}
            <section className="confirm-change-bar">
              <div className="confirm-change-top">
                <div>
                  <p className="eyebrow">CONFIRM OR CHANGE</p>
                  <p className="small muted">
                    {proposal
                      ? `Agent suggests ${proposal.proposed_priority ?? t.priority} priority. Confirm to apply or choose another priority.`
                      : `Current priority: ${t.priority}. Change below anytime.`}
                  </p>
                </div>
                {proposal && (
                  <Button
                    disabled={busy}
                    onClick={() => action(`proposals/${proposal.id}/approve`)}
                  >
                    <Check size={15} />
                    Confirm recommendation
                  </Button>
                )}
              </div>
              <div className="quick-priority-row" role="group" aria-label="Change priority">
                {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={busy}
                    className={`quick-priority-btn ${effectivePriority === p ? "is-selected" : ""}`}
                    onClick={() =>
                      action(`tickets/${t.id}`, { priority: p }, "PATCH")
                    }
                  >
                    {p.toLowerCase()}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <p className="eyebrow">ORIGINAL REQUEST</p>
              <div className="requester-row">
                <strong>{t.requester_name}</strong>
                <span className="muted">{t.requester_email}</span>
              </div>
              <p className="request-body">{t.description}</p>
            </section>

            <section>
              <div className="section-heading">
                <h3>
                  <Sparkles size={15} className="accent-icon" /> AI recommendation
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => action(`tickets/${t.id}/analyze`)}
                >
                  <RefreshCw size={13} />
                  Analyze again
                </Button>
              </div>
              <p className="small muted">
                Analysis: {t.analysis_state} · Decision: {t.approval_state}
              </p>

              <AgentStepList
                analysisState={t.analysis_state}
                hasIntent={Boolean(t.intent || proposal?.intent)}
                hasProposal={Boolean(proposal || t.proposals.length)}
                hasSources={hasSources}
                approvalState={t.approval_state}
              />

              {proposal ? (
                <div className="proposal">
                  <div className="proposal-header">
                    <span className="proposal-tag">
                      Proposed · Awaiting Confirmation
                    </span>
                    <span className="confidence-chip">
                      {Math.round(proposal.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="card-tags">
                    <span className="badge">
                      {proposal.proposed_priority || "Priority locked"}
                    </span>
                    <span className="intent">
                      {teams.find(
                        (team) => team.id === proposal.proposed_team_id,
                      )?.name || "Team locked"}
                    </span>
                    <span className="intent">Intent: {proposal.intent}</span>
                  </div>
                  <p>{proposal.rationale}</p>
                  <div className="actions">
                    <Button
                      disabled={busy}
                      onClick={() => action(`proposals/${proposal.id}/approve`)}
                    >
                      Approve recommendation
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => action(`proposals/${proposal.id}/reject`)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="muted">
                  No pending proposal. Analyze this request to generate one.
                </p>
              )}
            </section>

            <section>
              <div className="section-heading">
                <h3>
                  <ShieldCheck size={15} /> Change &amp; lock fields
                </h3>
              </div>
              <p className="small muted">
                Manual edits lock the changed field against AI overwrites and
                require a fresh sync approval.
              </p>
              <div className="form-row">
                <label>
                  Priority
                  <select
                    aria-label="Priority"
                    value={effectivePriority}
                    disabled={busy}
                    onChange={(e) =>
                      action(
                        `tickets/${t.id}`,
                        { priority: e.target.value as Priority },
                        "PATCH",
                      )
                    }
                  >
                    {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Assigned team
                  <select
                    aria-label="Assigned team"
                    value={effectiveTeamId}
                    disabled={busy}
                    onChange={(e) =>
                      action(
                        `tickets/${t.id}`,
                        { team_id: e.target.value || null },
                        "PATCH",
                      )
                    }
                  >
                    <option value="">Unassigned</option>
                    {teams.map((team) => (
                      <option value={team.id} key={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="locks">
                {["priority", "team_id", "status", "intent"].map((field) => (
                  <label key={field} className="lock-checkbox">
                    <input
                      type="checkbox"
                      checked={t.human_locked_fields.includes(field)}
                      disabled={busy}
                      onChange={(e) =>
                        action(
                          `tickets/${t.id}`,
                          {
                            human_locked_fields: e.target.checked
                              ? [...t.human_locked_fields, field]
                              : t.human_locked_fields.filter(
                                  (f) => f !== field,
                                ),
                          },
                          "PATCH",
                        )
                      }
                    />
                    <Lock size={11} />
                    Lock {field.replace("_id", "")}
                  </label>
                ))}
              </div>
            </section>

            <section>
              <div className="section-heading">
                <h3>
                  <BookOpen size={15} /> Response draft
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => action(`tickets/${t.id}/reply-drafts`)}
                >
                  Generate draft
                </Button>
              </div>
              {t.drafts.length ? (
                t.drafts.map((d) => (
                  <div key={d.id} className="draft">
                    <span className="badge">{d.state} · Internal only</span>
                    <p className="request-body">{d.body}</p>
                    {d.state === "DRAFT" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => action(`reply-drafts/${d.id}/approve`)}
                      >
                        Approve draft for review record
                      </Button>
                    )}
                    <details>
                      <summary>Knowledge sources ({d.sources.length})</summary>
                      {d.sources.map((s) => (
                        <blockquote key={s.chunk_id}>
                          <strong>
                            {s.title} · v{s.version}
                          </strong>
                          <p>{s.snippet}</p>
                          <small>
                            {s.source} · {s.chunk_id}
                          </small>
                        </blockquote>
                      ))}
                    </details>
                  </div>
                ))
              ) : (
                <p className="muted">No draft yet.</p>
              )}
              <p className="small muted">
                Draft approval records review. Customer messaging is not
                connected.
              </p>
            </section>

            <section>
              <div className="section-heading">
                <h3>
                  <CloudUpload size={15} /> Salesforce
                </h3>
                <span className="badge">{t.sync_status}</span>
              </div>
              {t.salesforce_case_id && (
                <p className="small muted">Case ID: {t.salesforce_case_id}</p>
              )}
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => {
                  if (
                    window.confirm(
                      "Approve this exact ticket version for Salesforce sync? In demo mode no Salesforce data is written.",
                    )
                  )
                    void action(`tickets/${t.id}/salesforce-sync`);
                }}
              >
                Approve this version &amp; request sync
              </Button>
            </section>

            <section>
              <h3>Audit timeline</h3>
              <ol className="timeline">
                {t.audit.map((a) => (
                  <li key={a.id}>
                    <strong>{a.action}</strong>
                    <span>
                      {a.actor_type} ·{" "}
                      {new Date(a.occurred_at).toLocaleString()}
                    </span>
                    <p>{a.reason}</p>
                    {a.run_id && <small>Run {a.run_id}</small>}
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
