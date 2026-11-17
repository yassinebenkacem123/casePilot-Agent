import { test, expect, type Page } from "@playwright/test";
async function login(page: Page) {
  await page.goto("/board");
  await expect(page).toHaveURL(/login/);
  await page
    .getByLabel("Operator token")
    .fill("e2e-operator-token-for-local-tests");
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Support overview." }),
  ).toBeVisible();
}
test("public intake persists and protected routes reject anonymous access", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/backend/tickets")).status()).toBe(401);
  await page.goto("/");
  await page.getByLabel("Your name").fill("Browser Customer");
  await page.getByLabel("Email address").fill("browser@example.com");
  await page.getByLabel("Subject").fill("Browser product question");
  await page
    .getByLabel("What’s happening?")
    .fill("Please help me get started with the product.");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("status")).toContainText("CP-");
  await page.screenshot({
    path: "test-results/intake-success.png",
    fullPage: true,
  });
  await login(page);
  await expect(
    page.getByRole("button", { name: "Browser product question", exact: true }),
  ).toBeVisible();
});
test("operator reviews, overrides, moves, reloads, and explicitly requests demo sync", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByText("Demo mode: not synced to Salesforce"),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Production outage for all users",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("CRITICAL", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Approve recommendation" }).click();
  await expect(
    dialog.getByText("Decision: APPROVED", { exact: false }),
  ).toBeVisible();
  await dialog.getByLabel("Priority", { exact: true }).selectOption("LOW");
  await expect(
    dialog.getByLabel("Lock priority", { exact: true }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Analyze again" }).click();
  await expect(
    dialog.getByText("Priority locked", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Priority", { exact: true })).toHaveValue(
    "LOW",
  );
  await dialog.getByRole("button", { name: "Approve recommendation" }).click();
  await page.getByRole("button", { name: "Close ticket" }).click();
  const card = page
    .locator("article.ticket-card")
    .filter({ hasText: "Production outage for all users" });
  await card.locator("select").selectOption("IN_PROGRESS");
  await expect(
    page
      .getByRole("region", { name: "En cours", exact: true })
      .getByRole("button", {
        name: "Production outage for all users",
        exact: true,
      }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "En cours", exact: true })
      .getByRole("button", {
        name: "Production outage for all users",
        exact: true,
      }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Production outage for all users",
      exact: true,
    })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Approve this version & request sync" })
    .click();
  await expect(
    page.getByRole("dialog").getByText("DEMO_NOT_SYNCED", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByText("Knowledge sources", { exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").locator("blockquote").first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/review-drawer.png",
    fullPage: true,
  });
});
test("pointer drag persists across columns including an empty column", async ({
  page,
}) => {
  await login(page);
  const card = page
    .locator("article.ticket-card")
    .filter({ hasText: "Unexpected invoice charge" });
  const handle = card.getByRole("button", { name: /^Drag / });
  const target = page
    .getByRole("region", { name: "À traiter", exact: true })
    .locator(".column-cards");
  const from = await handle.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Drag targets missing");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 15, from.y + 20, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 55, { steps: 20 });
  await page.mouse.up();
  await expect(
    target.getByRole("button", {
      name: "Unexpected invoice charge",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "À traiter", exact: true })
      .getByRole("button", { name: "Unexpected invoice charge", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/kanban-desktop.png",
    fullPage: true,
  });
});
test("mobile intake remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByLabel("Your name")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/intake-mobile.png",
    fullPage: true,
  });
});
