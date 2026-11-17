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
  ArrowDown,
  ArrowUp,
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
import { ApprovalBadge, PriorityBadge } from "@/components/ui/ai-status";
import { Button } from "@/components/ui/button";
import { TicketDrawer } from "@/features/review/drawer";
import { api } from "@/lib/api";
import {
  columns,
  type Detail,
  type Priority,
  type Status,
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

type MoveFn = (ticket: Ticket, status: Status, position: number) => void;

function Card({
  ticket,
  index,
  open,
  move,
  disabled,
  teams,
}: {
  ticket: Ticket;
  index: number;
  open: () => void;
  move: MoveFn;
  disabled: boolean;
  teams: Team[];
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: ticket.id,
    index,
    group: ticket.status,
    type: "ticket",
    accept: "ticket",
    disabled,
  });

  const teamName =
    teams.find((t) => t.id === ticket.team_id)?.name || "Unassigned";

  return (
    <article
      ref={ref}
      className={`ticket-card ${isDragging ? "dragging" : ""}`}
      data-testid={`ticket-${ticket.id}`}
    >
      <div className="card-top">
        <span className="ticket-ref">{ticket.public_ref}</span>
        <div className="card-top-right">
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
        <PriorityBadge priority={ticket.priority} />
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
          Move {ticket.public_ref}
        </label>
        <select
          id={`move-${ticket.id}`}
          aria-label={`Move ${ticket.public_ref}`}
          value={ticket.status}
          disabled={disabled}
          onChange={(e) => move(ticket, e.target.value as Status, 0)}
        >
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          aria-label={`Move ${ticket.public_ref} up`}
          disabled={disabled || index === 0}
          onClick={() => move(ticket, ticket.status, index - 1)}
        >
          <ArrowUp size={13} />
        </button>
        <button
          aria-label={`Move ${ticket.public_ref} down`}
          disabled={disabled}
          onClick={() => move(ticket, ticket.status, index + 1)}
        >
          <ArrowDown size={13} />
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
  move,
  disabled,
  teams,
}: {
  id: Status;
  label: string;
  tickets: Ticket[];
  open: (id: string) => void;
  move: MoveFn;
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
      className={`kanban-column column-${id.toLowerCase()}`}
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
            open={() => open(ticket.id)}
            move={move}
            disabled={disabled}
            teams={teams}
          />
        ))}
        {!tickets.length && (
          <div className="empty-column">
            <p>All clear here.</p>
            <span>Drop a request in this column.</span>
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
  const [priorityFilter, setPriorityFilter] = useState<Priority | "ALL">("ALL");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const tickets = useQuery({
    queryKey: ["tickets"],
    queryFn: () => api<{ items: Ticket[]; total: number }>("tickets?limit=200"),
    refetchInterval: dragging || busy ? false : 10000,
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
    refetchInterval: 10000,
  });

  const config = useQuery({
    queryKey: ["config"],
    queryFn: () =>
      api<{ salesforce_mode: string; analysis_mode: string }>("config"),
  });

  const rows = tickets.data?.items || [];
  const criticalCount = rows.filter(
    (t) => t.priority === "CRITICAL" && t.status !== "RESOLVED",
  ).length;
  const analyzedRows = rows.filter((t) => t.ai_confidence !== null);
  const avgConfidence = analyzedRows.length
    ? Math.round(
        (analyzedRows.reduce((acc, t) => acc + (t.ai_confidence ?? 0), 0) /
          analyzedRows.length) *
          100,
      )
    : null;
  const latestTicket = rows[0];

  const visible = rows.filter((t) => {
    const matchesSearch = `${t.subject} ${t.public_ref} ${t.requester_name} ${t.priority} ${t.team_id}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesPriority =
      priorityFilter === "ALL" || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  async function move(ticket: Ticket, status: Status, position: number) {
    const needsConfirmation =
      status !== ticket.status &&
      (status === "RESOLVED" || ticket.status === "RESOLVED");
    if (
      needsConfirmation &&
      !window.confirm(
        status === "RESOLVED" ? "Resolve this ticket?" : "Reopen this ticket?",
      )
    )
      return;
    setBusy(true);
    setError("");
    await client.cancelQueries({ queryKey: ["tickets"] });
    const previous = client.getQueryData<{ items: Ticket[]; total: number }>([
      "tickets",
    ]);
    const destination = rows
      .filter((t) => t.status === status && t.id !== ticket.id)
      .sort((a, b) => a.position - b.position);
    destination.splice(Math.min(position, destination.length), 0, {
      ...ticket,
      status,
    });
    const optimistic = rows
      .map((t) => destination.find((d) => d.id === t.id) || t)
      .map((t) =>
        t.status === status
          ? { ...t, position: destination.findIndex((d) => d.id === t.id) }
          : t,
      );
    client.setQueryData(["tickets"], { ...previous, items: optimistic });
    try {
      await api<Detail>(`tickets/${ticket.id}/position`, {
        method: "PATCH",
        body: JSON.stringify({
          expected_version: ticket.version,
          status,
          position,
          confirmed: needsConfirmation,
        }),
      });
    } catch (error) {
      client.setQueryData(["tickets"], previous);
      setError((error as Error).message);
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
            <BrandLogo variant="dark-surface" size="sm" />
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
        <Link href="/" className="nav-item">
          <Plus size={17} />
          <span>Customer intake</span>
        </Link>

        <div className="sidebar-bottom">
          <div className="human-note">
            <ShieldCheck size={18} />
            <strong>Human at the helm</strong>
            <p>AI proposes triage & drafts. Your team approves every action.</p>
          </div>
          <div className="operator">
            <span className="operator-avatar">OP</span>
            <div className="operator-meta">
              <strong>Support operator</strong>
              <small>Demo workspace</small>
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
            <strong>Overview</strong>
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
                Monitor incoming requests, review AI triage proposals, and
                orchestrate Salesforce Case sync.
              </p>
            </div>
            <Link className="button primary" href="/">
              <Plus size={16} />
              New request
            </Link>
          </div>

          <div className="demo-banner">
            <LifeBuoy size={16} />
            <span>
              {config.data?.salesforce_mode === "live"
                ? "Salesforce live mode selected · only approved snapshots can sync"
                : "Demo mode: not synced to Salesforce"}
              {config.data?.analysis_mode === "deterministic_demo" &&
                " · Deterministic AI demo"}
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
              <p>Awaiting human decision</p>
            </article>

            <article>
              <div className="metric-header">
                <span>Critical tickets</span>
                <span className="metric-icon metric-danger">
                  <AlertOctagon size={15} />
                </span>
              </div>
              <strong>{tickets.isPending ? "—" : criticalCount}</strong>
              <p>Active high-severity cases</p>
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
              <h2>Request board</h2>
              <span className="count">{visible.length}</span>
              <div
                className="priority-filters"
                role="group"
                aria-label="Filter by priority"
              >
                {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      className={`filter-pill ${priorityFilter === p ? "is-active" : ""}`}
                      onClick={() => setPriorityFilter(p)}
                    >
                      {p === "ALL" ? "All" : p.toLowerCase()}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="search-controls">
              <label className="search">
                <Search size={15} />
                <span className="sr-only">Search requests</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search requests, priority, team…"
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
            Drag a handle to move requests. Keyboard: focus a handle, press
            Space, use arrows, then Space to drop. Card controls also move and
            reorder.
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
                const columnTarget = columns.find((c) => c.id === target.id);
                const group = (columnTarget?.id ?? source.group) as Status;
                const position = columnTarget
                  ? rows.filter((t) => t.status === group && t.id !== source.id)
                      .length
                  : source.index;
                if (
                  ticket &&
                  columns.some((c) => c.id === group) &&
                  (group !== ticket.status ||
                    source.index !== source.initialIndex)
                )
                  void move(ticket, group, position);
              }}
            >
              <div className="kanban">
                {columns.map((c) => (
                  <Column
                    key={c.id}
                    {...c}
                    tickets={visible
                      .filter((t) => t.status === c.id)
                      .sort((a, b) => a.position - b.position)}
                    open={setSelected}
                    move={move}
                    disabled={busy || !!search || priorityFilter !== "ALL"}
                    teams={teams.data || []}
                  />
                ))}
              </div>
            </DragDropProvider>
          )}

          {tickets.data && tickets.data.total > rows.length && (
            <p className="muted">
              Showing the first {rows.length} of {tickets.data.total} requests.
              Use the paginated API for larger boards.
            </p>
          )}

          <div className="board-footer">
            <ShieldCheck size={14} /> Every AI suggestion requires your review.
            <span>No SLA policy configured</span>
          </div>
        </div>
      </main>

      <TicketDrawer
        ticketId={selected}
        close={() => setSelected(null)}
        teams={teams.data || []}
      />
    </div>
  );
}
