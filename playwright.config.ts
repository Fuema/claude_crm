import { defineConfig, devices } from '@playwright/test'

const PORT = 3000

export default defineConfig({
  testDir: 'src/tests/e2e',
  fullyParallel: true,
  // Flows sign up a user and build their data first; the dev server compiles
  // pages on first use.
  timeout: 60_000,
  // The dev server compiles a server function on its first call after a
  // change, which can take several seconds.
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    // No animations: accessibility scans never see an element mid-fade (e.g. a
    // toast leaving at half opacity), and clicks never hit a moving target.
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'bun run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
