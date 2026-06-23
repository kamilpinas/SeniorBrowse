import { defineConfig } from "@playwright/test"

// E2E tests load the real built extension (dist/) into a persistent Chromium
// context — there's no "browser" to share across tests like normal Playwright
// projects, so each test gets its own context/profile via e2e/fixtures.ts.
// Run `npm run build` before this (wired into the test:e2e script) so dist/
// reflects the current source.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    trace: "retain-on-failure",
  },
})
