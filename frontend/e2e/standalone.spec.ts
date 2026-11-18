import { expect, test } from "@playwright/test";

test("standalone intake, token login, AI review, manual priority, and reload", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/backend/tickets")).status()).toBe(401);
  await page.goto("/login");
  await page.getByLabel("Operator token").fill("incorrect-token");
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page.getByRole("alert")).toContainText("Invalid operator token");
  await page
    .getByLabel("Operator token")
    .fill("e2e-operator-token-for-local-tests");
  await page.getByRole("button", { name: "Open workspace" }).click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(
    page.getByText("Standalone mode", { exact: false }),
  ).toBeVisible();

  const subject = `Standalone billing check ${Date.now()}`;
  await page.goto("/");
  await page.getByLabel("Your name").fill("Standalone Test Customer");
  await page.getByLabel("Email address").fill("standalone-test@example.com");
  await page.getByLabel("Subject").fill(subject);
  await page
    .getByLabel("What’s happening?")
    .fill(
      "There is an unexpected invoice charge. Please help me check the billing invoice.",
    );
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("status")).toContainText("CP-");
  await page.goto("/board");
  await page.getByRole("button", { name: subject, exact: true }).click();
  const drawer = page.getByRole("dialog");
  await expect(
    drawer.getByRole("button", { name: "Approve recommendation", exact: true }),
  ).toBeVisible({ timeout: 90000 });
  await expect(
    drawer.getByRole("heading", { name: "Salesforce", exact: true }),
  ).toHaveCount(0);
  await expect(
    drawer.getByRole("button", { name: /request sync/i }),
  ).toHaveCount(0);
  await drawer
    .getByRole("button", { name: "Approve recommendation", exact: true })
    .click();
  await expect(drawer.getByLabel("Assigned team", { exact: true })).toHaveValue(
    "billing",
  );
  await drawer.getByLabel("Priority", { exact: true }).selectOption("LOW");
  await expect(
    drawer.getByLabel("Lock priority", { exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Close ticket" }).click();
  await page.reload();
  const low = page.getByRole("region", { name: "Low", exact: true });
  await expect(
    low.getByRole("button", { name: subject, exact: true }),
  ).toBeVisible();
  await low.getByRole("button", { name: subject, exact: true }).click();
  await expect(drawer.getByLabel("Priority", { exact: true })).toHaveValue(
    "LOW",
  );
  await expect(
    drawer.getByRole("heading", { name: "Audit timeline" }),
  ).toBeVisible();
});
