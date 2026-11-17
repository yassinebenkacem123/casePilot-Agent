import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { IntakeForm } from "@/features/tickets/intake";
afterEach(() => vi.unstubAllGlobals());
it("shows the saved tracking ID and keeps retry submissions idempotent", async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("Network interrupted"))
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracking_id: "CP-TEST123" }),
    });
  vi.stubGlobal("fetch", fetcher);
  const user = userEvent.setup();
  render(<IntakeForm />);
  await user.type(screen.getByLabelText("Your name"), "Demo Customer");
  await user.type(screen.getByLabelText("Email address"), "demo@example.com");
  await user.type(screen.getByLabelText("Subject"), "Account access");
  await user.type(
    screen.getByLabelText("What’s happening?"),
    "Please help me access my account.",
  );
  await user.click(screen.getByRole("button", { name: "Send request" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Network interrupted",
  );
  await user.click(screen.getByRole("button", { name: "Send request" }));
  expect(await screen.findByRole("status")).toHaveTextContent("CP-TEST123");
  expect(fetcher.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
    fetcher.mock.calls[1][1].headers["Idempotency-Key"],
  );
});
