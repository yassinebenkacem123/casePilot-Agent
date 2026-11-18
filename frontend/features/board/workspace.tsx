"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  DragDropProvider,
  useDragDropManager,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import {
  GripVertical,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SupportAgentPopup } from "@/components/support-agent-popup";
import { PriorityBadge } from "@/components/ui/ai-status";
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

function SafeDndCleanup() {
  const manager = useDragDropManager();
  useEffect(() => {
    if (!manager) return;
    const originalDestroy = manager.destroy.bind(manager);
    Reflect.set(manager, "destroy", () => {
      queueMicrotask(() => originalDestroy());
    });
  }, [manager]);
  return null;
}

function getEffectiveColumn(ticket: Ticket): PriorityColumnId {
  const effective = ticket.proposed_priority ?? ticket.priority;
  if (effective === "LOW") return "LOW";
  if (effective === "HIGH" || effective === "CRITICAL") return "HIGH";
  return "MEDIUM";
}

function Card({
  ticket,
  columnId,
  open,
  disabled,
  teams,
}: {
  ticket: Ticket;
  columnId: PriorityColumnId;
  open: () => void;
  disabled: boolean;
  teams: Team[];
}) {
  const { ref, handleRef, isDragging } = useDraggable({
    id: ticket.id,
    type: "ticket",
    disabled,
    data: { columnId },
  });

  const teamName =
    teams.find((t) => t.id === ticket.team_id)?.name || "Unassigned";
  const effectivePriority = ticket.proposed_priority ?? ticket.priority;
  const isApproved = ticket.approval_state === "APPROVED";

  return (
    <article
      ref={ref}
      className={`ticket-card jira-card ${isDragging ? "dragging" : ""}`}
      data-testid={`ticket-${ticket.id}`}
    >
      <button className="card-title" onClick={open}>
        {ticket.subject}
      </button>

      <div className="jira-card-tags">
        {ticket.intent && <span className="jira-tag">{ticket.intent}</span>}
        <span className="jira-tag">{teamName}</span>
      </div>

      <div className="jira-card-footer">
        <div className="jira-card-left">
          <PriorityBadge priority={effectivePriority} />
          <span className="ticket-ref">{ticket.public_ref}</span>
        </div>
        <div className="jira-card-right">
          <span
            className={`jira-state ${isApproved ? "is-approved" : "is-pending"}`}
          >
            {isApproved ? "Confirmed" : "Review"}
          </span>
          <button
            ref={handleRef}
            className="drag-handle"
            aria-label={`Drag ${ticket.public_ref}`}
          >
            <GripVertical size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

function Column({
  id,
  label,
  tickets,
  open,
  disabled,
  teams,
}: {
  id: PriorityColumnId;
  label: string;
  tickets: Ticket[];
  open: (id: string) => void;
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
      className={`kanban-column jira-column column-priority-${id.toLowerCase()}`}
      aria-label={label}
    >
      <header className="jira-column-header">
        <span className="column-dot" />
        <h2>{label.toUpperCase()}</h2>
        <span className="count">{tickets.length}</span>
      </header>
      <div
        ref={ref}
        className={`column-cards ${tickets.length > 5 ? "is-scrollable" : ""}`}
      >
        {tickets.map((ticket) => (
          <Card
            key={ticket.id}
            ticket={ticket}
            columnId={id}
            open={() => open(ticket.id)}
            disabled={disabled}
            teams={teams}
          />
        ))}
        {!tickets.length && (
          <div className="empty-column">
            <p>No {label.toLowerCase()} tickets</p>
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
  const draggingRef = useRef(false);

  const tickets = useQuery({
    queryKey: ["tickets"],
    queryFn: () => api<{ items: Ticket[]; total: number }>("tickets?limit=200"),
    refetchInterval: () => (draggingRef.current || busy ? false : 5000),
    refetchOnWindowFocus: false,
  });

  const teams = useQuery({
    queryKey: ["teams"],
    queryFn: () => api<Team[]>("teams"),
  });

  const rows = tickets.data?.items || [];
  const visible = rows.filter((t) =>
    `${t.subject} ${t.public_ref} ${t.requester_name} ${t.priority} ${t.proposed_priority ?? ""} ${t.team_id ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function changePriority(ticket: Ticket, priority: Priority) {
    if (ticket.priority === priority && !ticket.proposed_priority) return;
    const previous = client.getQueryData<{ items: Ticket[]; total: number }>([
      "tickets",
    ]);
    const optimistic = rows.map((t) =>
      t.id === ticket.id ? { ...t, priority, proposed_priority: null } : t,
    );
    client.setQueryData(["tickets"], { ...previous, items: optimistic });
    setBusy(true);
    setError("");
    try {
      await client.cancelQueries({ queryKey: ["tickets"] });
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
            <BrandLogo variant="light-surface" size="md" />
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

        <p className="workspace-label">PROJECT</p>
        <Link href="/board" className="nav-item nav-active">
          <LayoutDashboard size={16} />
          <span>Board</span>
        </Link>
        <button
          type="button"
          className="nav-item nav-item-button"
          onClick={() => setAgentOpen(true)}
        >
          <Plus size={16} />
          <span>Create issue</span>
        </button>

        <div className="sidebar-bottom">
          <div className="operator">
            <span className="operator-avatar">OP</span>
            <div className="operator-meta">
              <strong>Support operator</strong>
              <small>CasePilot Board</small>
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
        <header className="jira-header">
          <div className="jira-header-left">
            <div className="jira-breadcrumbs">
              <span>Projects</span>
              <span className="slash">/</span>
              <span>CasePilot AI</span>
            </div>
            <h1>Support board</h1>
          </div>

          <div className="jira-header-controls">
            <label className="search">
              <Search size={14} />
              <span className="sr-only">Search board</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search board"
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              aria-label="Refresh board"
              onClick={() => client.invalidateQueries()}
            >
              <RefreshCw size={14} />
            </Button>
            <Button size="sm" onClick={() => setAgentOpen(true)}>
              <Plus size={15} />
              Create
            </Button>
          </div>
        </header>

        <div className="board-content jira-board-content">
          {(error || tickets.error || teams.error) && (
            <p role="alert" className="error">
              {error || (tickets.error || teams.error)?.message}
            </p>
          )}

          <DragDropProvider
            onDragStart={() => {
              draggingRef.current = true;
              void client.cancelQueries({ queryKey: ["tickets"] });
            }}
            onDragEnd={(event) => {
              draggingRef.current = false;
              if (event.canceled) return;
              const { source, target } = event.operation;
              if (!source || !target) return;
              const ticket = rows.find((t) => t.id === source.id);
              const columnTarget = priorityColumns.find(
                (c) => c.id === target.id,
              );
              if (
                ticket &&
                columnTarget &&
                columnTarget.id !== getEffectiveColumn(ticket)
              ) {
                void changePriority(ticket, columnTarget.id);
              }
            }}
          >
            <SafeDndCleanup />
            {tickets.isPending ? (
              <div className="kanban-skeleton" role="status">
                Loading board…
              </div>
            ) : (
              <div className="kanban kanban-3 jira-kanban">
                {priorityColumns.map((c) => (
                  <Column
                    key={c.id}
                    {...c}
                    tickets={visible.filter(
                      (t) => getEffectiveColumn(t) === c.id,
                    )}
                    open={setSelected}
                    disabled={busy || !!search}
                    teams={teams.data || []}
                  />
                ))}
              </div>
            )}
          </DragDropProvider>
        </div>
      </main>

      <TicketDrawer
        ticketId={selected}
        close={() => setSelected(null)}
        teams={teams.data || []}
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
