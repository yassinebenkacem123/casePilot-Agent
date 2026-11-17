"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
        <DialogTitle>{t?.subject || "Loading ticket…"}</DialogTitle>
        <DialogDescription>
          {t?.public_ref || "Ticket detail"} · Review recommendations before
          applying them.
        </DialogDescription>
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
            <section>
              <p className="eyebrow">ORIGINAL REQUEST</p>
              <strong>{t.requester_name}</strong>
              <p className="muted">{t.requester_email}</p>
              <p className="request-body">{t.description}</p>
            </section>
            <section>
              <h3>Operator decision</h3>
              <p className="small muted">
                Edits lock the changed field against AI updates and require a
                fresh sync approval.
              </p>
              <div className="form-row">
                <label>
                  Priority
                  <select
                    aria-label="Priority"
                    value={t.priority}
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
                    value={t.team_id || ""}
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
                  <label key={field}>
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
                    Lock {field.replace("_id", "")}
                  </label>
                ))}
              </div>
            </section>
            <section>
              <div className="section-heading">
                <h3>AI recommendation</h3>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => action(`tickets/${t.id}/analyze`)}
                >
                  Analyze again
                </Button>
              </div>
              <p className="small muted">
                Analysis: {t.analysis_state} · Decision: {t.approval_state}
              </p>
              {proposal ? (
                <div className="proposal">
                  <div className="card-tags">
                    <span className="badge">
                      {proposal.proposed_priority || "Priority locked"}
                    </span>
                    <span>
                      {teams.find(
                        (team) => team.id === proposal.proposed_team_id,
                      )?.name || "Team locked"}
                    </span>
                    <span>
                      {Math.round(proposal.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p>{proposal.rationale}</p>
                  <p className="small muted">
                    Intent: {proposal.intent} · Locked fields are preserved.
                    Approval applies the recommendation atomically.
                  </p>
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
                <h3>Response draft</h3>
                <Button
                  variant="outline"
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
              <h3>Salesforce</h3>
              <p>
                Status: <strong>{t.sync_status}</strong>
              </p>
              {t.salesforce_case_id && <p>Case ID: {t.salesforce_case_id}</p>}
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
                Approve this version & request sync
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
