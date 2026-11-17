import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 12000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command:
        '"..\\backend\\.venv\\Scripts\\python.exe" "..\\backend\\tests\\e2e_server.py"',
      url: "http://127.0.0.1:8100/health",
      timeout: 60000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 3100",
      url: "http://127.0.0.1:3100",
      timeout: 60000,
      reuseExistingServer: false,
      env: {
        BACKEND_URL: "http://127.0.0.1:8100",
        OPERATOR_TOKEN: "e2e-operator-token-for-local-tests",
        SESSION_SECRET: "e2e-only-session-secret-at-least-32-characters",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
