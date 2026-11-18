"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Clock,
  GripVertical,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SupportAgentPopup } from "@/components/support-agent-popup";
import { ApprovalBadge, PriorityBadge } from "@/components/ui/ai-status";
import { Button } from "@/components/ui/button";
import { TicketDrawer } from "@/features/review/drawer";
import { api } from "@/lib/api";
import {
  priorityColumns,
  type Detail,
  type Priority,
  type PriorityColumnId,
  type Team,
  type Ticket,
} from "@/lib/types";

export function Workspace() {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <Board />
    </QueryClientProvider>
  );
}

function getEffectiveColumn(ticket: Ticket): PriorityColumnId {
  const effective = ticket.proposed_priority ?? ticket.priority;
  if (effective === "LOW") return "LOW";
  if (effective === "HIGH" || effective === "CRITICAL") return "HIGH";
  return "MEDIUM";
}

type ChangePriorityFn = (ticket: Ticket, priority: Priority) => void;

function Card({
  ticket,
  index,
  columnId,
  open,
  changePriority,
  disabled,
  teams,
}: {
  ticket: Ticket;
  index: number;
  columnId: PriorityColumnId;
  open: () => void;
  changePriority: ChangePriorityFn;
  disabled: boolean;
  teams: Team[];
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: ticket.id,
    index,
    group: columnId,
    type: "ticket",
    accept: "ticket",
    disabled,
  });

  const teamName =
    teams.find((t) => t.id === ticket.team_id)?.name || "Unassigned";
  const effectivePriority = ticket.proposed_priority ?? ticket.priority;
  const isAiSuggested = Boolean(
    ticket.proposed_priority && ticket.approval_state !== "APPROVED",
  );

  return (
    <article
      ref={ref}
      className={`ticket-card ${isDragging ? "dragging" : ""}`}
      data-testid={`ticket-${ticket.id}`}
    >
      <div className="card-top">
        <span className="ticket-ref">{ticket.public_ref}</span>
        <div className="card-top-right">
          {isAiSuggested && (
            <span className="ai-auto-chip" title="Auto-triaged by CasePilot AI">
              <Sparkles size={10} />
              AI Auto
            </span>
          )}
          {ticket.human_locked_fields.length > 0 && (
            <span className="lock-chip" title="Human-locked fields">
              Locked ({ticket.human_locked_fields.length})
            </span>
          )}
          <button
            ref={handleRef}
            className="drag-handle"
            aria-label={`Drag ${ticket.public_ref}`}
          >
            <GripVertical size={15} />
          </button>
        </div>
      </div>

      <button className="card-title" onClick={open}>
        {ticket.subject}
      </button>
      <p className="customer">{ticket.requester_name}</p>

      <div className="card-tags">
        <PriorityBadge priority={effectivePriority} />
        <span className="intent">{ticket.intent || "Awaiting analysis"}</span>
      </div>

      <div className="card-meta">
        <span>{teamName}</span>
        <span className="confidence-chip">
          <Sparkles size={10} />
          {ticket.ai_confidence !== null
            ? `${Math.round(ticket.ai_confidence * 100)}% AI`
            : "Pending AI"}
        </span>
      </div>

      <div className="card-bottom">
        <ApprovalBadge state={ticket.approval_state} />
        <time dateTime={ticket.updated_at}>
          {new Date(ticket.updated_at).toLocaleDateString()}
        </time>
      </div>

      <div className="accessible-move">
        <label className="sr-only" htmlFor={`move-${ticket.id}`}>
          Priority for {ticket.public_ref}
        </label>
        <select
          id={`move-${ticket.id}`}
          aria-label={`Move ${ticket.public_ref}`}
          value={columnId}
          disabled={disabled}
          onChange={(e) => changePriority(ticket, e.target.value as Priority)}
        >
          {priorityColumns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="button" className="card-review-btn" onClick={open}>
          Confirm / Change
        </button>
      </div>
    </article>
  );
}

function Column({
  id,
  label,
  tickets,
  open,
  changePriority,
  disabled,
  teams,
}: {
  id: PriorityColumnId;
  label: string;
  tickets: Ticket[];
  open: (id: string) => void;
  changePriority: ChangePriorityFn;
  disabled: boolean;
  teams: Team[];
}) {
  const { ref } = useDroppable({
    id,
    type: "column",
    accept: "ticket",
    collisionPriority: 0,
  });

  return (
    <section
      className={`kanban-column column-priority-${id.toLowerCase()}`}
      aria-label={label}
    >
      <header>
        <span className="column-dot" />
        <h2>{label}</h2>
        <span className="count">{tickets.length}</span>
      </header>
      <div ref={ref} className="column-cards">
        {tickets.map((ticket, index) => (
          <Card
            key={ticket.id}
            ticket={ticket}
            index={index}
            columnId={id}
            open={() => open(ticket.id)}
            changePriority={changePriority}
            disabled={disabled}
            teams={teams}
          />
        ))}
        {!tickets.length && (
          <div className="empty-column">
            <p>No {label.toLowerCase()} priority tickets.</p>
            <span>Agent-triaged requests appear here automatically.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function Board() {
  const router = useRouter();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const tickets = useQuery({
    queryKey: ["tickets"],
    queryFn: () => api<{ items: Ticket[]; total: number }>("tickets?limit=200"),
    refetchInterval: dragging || busy ? false : 5000,
    refetchOnWindowFocus: false,
    enabled: !dragging,
  });

  const teams = useQuery({
    queryKey: ["teams"],
    queryFn: () => api<Team[]>("teams"),
  });

  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: () =>
      api<{
        total: number;
        review: number;
        in_progress: number;
        resolved: number;
      }>("dashboard/metrics"),
    refetchInterval: 5000,
  });

  const config = useQuery({
    queryKey: ["config"],
    queryFn: () =>
      api<{ salesforce_mode: string; analysis_mode: string }>("config"),
  });

  const rows = tickets.data?.items || [];
  const highCount = rows.filter((t) => getEffectiveColumn(t) === "HIGH").length;
  const analyzedRows = rows.filter((t) => t.ai_confidence !== null);
  const avgConfidence = analyzedRows.length
    ? Math.round(
        (analyzedRows.reduce((acc, t) => acc + (t.ai_confidence ?? 0), 0) /
          analyzedRows.length) *
          100,
      )
    : null;
  const latestTicket = rows[0];

  const visible = rows.filter((t) =>
    `${t.subject} ${t.public_ref} ${t.requester_name} ${t.priority} ${t.proposed_priority ?? ""} ${t.team_id ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function changePriority(ticket: Ticket, priority: Priority) {
    if (ticket.priority === priority && !ticket.proposed_priority) return;
    setBusy(true);
    setError("");
    await client.cancelQueries({ queryKey: ["tickets"] });
    const previous = client.getQueryData<{ items: Ticket[]; total: number }>([
      "tickets",
    ]);
    const optimistic = rows.map((t) =>
      t.id === ticket.id ? { ...t, priority, proposed_priority: null } : t,
    );
    client.setQueryData(["tickets"], { ...previous, items: optimistic });
    try {
      await api<Detail>(`tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          expected_version: ticket.version,
          priority,
          reason: `Operator moved ticket to ${priority} priority column`,
        }),
      });
    } catch (err) {
      client.setQueryData(["tickets"], previous);
      setError((err as Error).message);
    } finally {
      await client.invalidateQueries();
      setBusy(false);
    }
  }

  return (
    <div className={`workspace ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link href="/" className="brand-link" aria-label="CasePilot AI Home">
            <BrandLogo variant="light-surface" size="sm" />
          </Link>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            onClick={() => setSidebarCollapsed((c) => !c)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        </div>

        <p className="workspace-label">COMMAND CENTER</p>
        <Link href="/board" className="nav-item nav-active">
          <LayoutDashboard size={17} />
          <span>Overview</span>
        </Link>
        <button
          type="button"
          className="nav-item nav-item-button"
          onClick={() => setAgentOpen(true)}
        >
          <Sparkles size={17} />
          <span>Support Agent</span>
        </button>

        <div className="sidebar-bottom">
          <div className="human-note">
            <ShieldCheck size={18} />
            <strong>Human at the helm</strong>
            <p>
              AI auto-triages into Low, Medium &amp; High. You confirm or
              change.
            </p>
          </div>
          <div className="operator">
            <span className="operator-avatar">OP</span>
            <div className="operator-meta">
              <strong>Support operator</strong>
              <small>Workspace admin</small>
            </div>
            <button
              aria-label="Sign out"
              onClick={async () => {
                await fetch("/api/session", { method: "DELETE" });
                router.replace("/login");
                router.refresh();
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="board-main">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>Priority Triage Board</strong>
          </div>
          <div className="topbar-right">
            <span className="workspace-pill">
              <span className="status-dot" />
              Single organization
            </span>
          </div>
        </header>

        <div className="board-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">INTELLIGENT SUPPORT ORCHESTRATION</p>
              <h1>
                Support overview<span>.</span>
              </h1>
              <p className="muted">
                Tickets are automatically triaged into Low, Medium, and High
                columns. Click any card to confirm or change.
              </p>
            </div>
            <Button onClick={() => setAgentOpen(true)}>
              <Plus size={16} />
              Ask Support Agent
            </Button>
          </div>

          <div className="demo-banner">
            <LifeBuoy size={16} />
            <span>
              {config.data?.salesforce_mode === "live"
                ? "Salesforce live mode selected · only approved snapshots can sync"
                : config.data?.salesforce_mode === "demo"
                  ? "Demo mode: not synced to Salesforce"
                  : "Standalone mode · tickets saved locally"}
              {config.data?.analysis_mode === "deterministic_demo"
                ? " · Deterministic AI demo"
                : " · Live AI agent active"}
            </span>
          </div>

          <section className="metrics" aria-label="Dashboard metrics">
            <article>
              <div className="metric-header">
                <span>Total tickets</span>
                <span className="metric-icon">
                  <Inbox size={15} />
                </span>
              </div>
              <strong>{metrics.data?.total ?? "—"}</strong>
              <p>Across your workspace</p>
            </article>

            <article>
              <div className="metric-header">
                <span>Pending review</span>
                <span className="metric-icon metric-warn">
                  <Clock size={15} />
                </span>
              </div>
              <strong>{metrics.data?.review ?? "—"}</strong>
              <p>Awaiting confirmation</p>
            </article>

            <article>
              <div className="metric-header">
                <span>High &amp; Critical</span>
                <span className="metric-icon metric-danger">
                  <AlertOctagon size={15} />
                </span>
              </div>
              <strong>{tickets.isPending ? "—" : highCount}</strong>
              <p>Urgent agent-triaged cases</p>
            </article>

            <article>
              <div className="metric-header">
                <span>Resolved tickets</span>
                <span className="metric-icon metric-success">
                  <CheckCircle2 size={15} />
                </span>
              </div>
              <strong>{metrics.data?.resolved ?? "—"}</strong>
              <p>Completed &amp; closed</p>
            </article>
          </section>

          <section
            className="telemetry-strip"
            aria-label="AI automation and recent activity"
          >
            <div className="telemetry-item">
              <Sparkles size={14} className="accent-icon" />
              <span>
                AI triaged:{" "}
                <strong>
                  {analyzedRows.length}/{rows.length}
                </strong>
              </span>
            </div>
            <div className="telemetry-item">
              <Activity size={14} />
              <span>
                Avg confidence:{" "}
                <strong>
                  {avgConfidence !== null ? `${avgConfidence}%` : "—"}
                </strong>
              </span>
            </div>
            {latestTicket && (
              <button
                type="button"
                className="telemetry-recent"
                onClick={() => setSelected(latestTicket.id)}
              >
                Latest: <strong>{latestTicket.public_ref}</strong> —{" "}
                {latestTicket.subject}
              </button>
            )}
          </section>

          <div className="board-toolbar">
            <div className="board-toolbar-left">
              <h2>Priority triage board</h2>
              <span className="count">{visible.length}</span>
            </div>
            <div className="search-controls">
              <label className="search">
                <Search size={15} />
                <span className="sr-only">Search requests</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requests, ref, team…"
                />
              </label>
              <Button
                variant="outline"
                aria-label="Refresh board"
                onClick={() => client.invalidateQueries()}
              >
                <RefreshCw size={15} />
              </Button>
            </div>
          </div>

          <p className="board-hint">
            Drag cards between Low, Medium, and High columns to override
            priority, or click any ticket to confirm or change the AI
            recommendation.
          </p>

          {(error ||
            tickets.error ||
            metrics.error ||
            teams.error ||
            config.error) && (
            <p role="alert" className="error">
              {error ||
                (tickets.error || metrics.error || teams.error || config.error)
                  ?.message}
            </p>
          )}

          {tickets.isPending ? (
            <div className="kanban-skeleton" role="status">
              Loading requests…
            </div>
          ) : (
            <DragDropProvider
              onDragStart={() => {
                setDragging(true);
                void client.cancelQueries({ queryKey: ["tickets"] });
              }}
              onDragEnd={(event) => {
                setDragging(false);
                if (event.canceled) return;
                const { source, target } = event.operation;
                if (!source || !target || !isSortable(source)) return;
                const ticket = rows.find((t) => t.id === source.id);
                const columnTarget = priorityColumns.find(
                  (c) => c.id === target.id,
                );
                const targetPriority = (columnTarget?.id ??
                  source.group) as PriorityColumnId;
                if (
                  ticket &&
                  priorityColumns.some((c) => c.id === targetPriority) &&
                  targetPriority !== getEffectiveColumn(ticket)
                ) {
                  void changePriority(ticket, targetPriority);
                }
              }}
            >
              <div className="kanban kanban-3">
                {priorityColumns.map((c) => (
                  <Column
                    key={c.id}
                    {...c}
                    tickets={visible.filter(
                      (t) => getEffectiveColumn(t) === c.id,
                    )}
                    open={setSelected}
                    changePriority={changePriority}
                    disabled={busy || !!search}
                    teams={teams.data || []}
                  />
                ))}
              </div>
            </DragDropProvider>
          )}

          <div className="board-footer">
            <ShieldCheck size={14} /> Every AI recommendation can be confirmed
            or changed by an operator.
            <span>No SLA policy configured</span>
          </div>
        </div>
      </main>

      <TicketDrawer
        ticketId={selected}
        close={() => setSelected(null)}
        teams={teams.data || []}
        salesforceEnabled={
          config.data?.salesforce_mode === "live" ||
          config.data?.salesforce_mode === "demo"
        }
      />

      <SupportAgentPopup
        open={agentOpen}
        onOpenChange={setAgentOpen}
        onSubmitted={() => {
          void client.invalidateQueries();
        }}
      />
    </div>
  );
}
