import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { TicketDrawer } from "@/features/review/drawer";
import type { Detail } from "@/lib/types";

const ticket: Detail = {
  id: "local-test-ticket",
  public_ref: "CP-LOCALTEST",
  requester_name: "Local Customer",
  requester_email: "local@example.com",
  subject: "Local billing question",
  description: "Please help with an invoice question.",
  status: "REVIEW",
  priority: "MEDIUM",
  priority_rank: 2,
  position: 0,
  intent: "billing",
  team_id: "billing",
  analysis_state: "ANALYZED",
  ai_confidence: 0.9,
  approval_state: "PENDING",
  human_locked_fields: [],
  version: 2,
  salesforce_case_id: null,
  sync_status: "NOT_SYNCED",
  created_at: "2026-11-18T12:00:00Z",
  updated_at: "2026-11-18T12:00:00Z",
  proposals: [
    {
      id: "proposal-1",
      proposed_priority: "MEDIUM",
      proposed_team_id: "billing",
      proposed_status: null,
      intent: "billing",
      rationale: "Invoice requires billing review.",
      confidence: 0.9,
      state: "PENDING",
      base_version: 2,
      agent_run_id: "run-1",
    },
  ],
  drafts: [],
  audit: [],
};

vi.mock("@/lib/api", () => ({ api: vi.fn(async () => ticket) }));

it("keeps human review and manual edits available without Salesforce controls", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TicketDrawer
        ticketId={ticket.id}
        close={() => {}}
        teams={[{ id: "billing", name: "Billing" }]}
        salesforceEnabled={false}
      />
    </QueryClientProvider>,
  );
  expect(
    await screen.findByRole("button", { name: "Approve recommendation" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: /^Reject$/ }),
  ).toBeVisible();
  expect(
    screen.getByRole("combobox", { name: /^Priority$/ }),
  ).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Assigned team" })).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "Salesforce" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /request sync/i }),
  ).not.toBeInTheDocument();
  client.clear();
});
