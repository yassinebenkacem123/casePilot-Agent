import { defineConfig } from "@playwright/test";

// Verify the user's running standalone app without starting or replacing its servers.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "standalone.spec.ts",
  workers: 1,
  timeout: 120000,
  expect: { timeout: 20000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
