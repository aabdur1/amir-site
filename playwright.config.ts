import { defineConfig, devices } from '@playwright/test'

// E2E harness. Specs live in ./e2e (kept out of the vitest `include`/`exclude`
// so the two runners never collide). The dev server is auto-started by the
// webServer block; set reuseExistingServer so a dev server you already have
// running on :3000 is reused instead of spawning a second one.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
