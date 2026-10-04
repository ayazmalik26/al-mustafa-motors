import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a running stack (database + API + website):
 *
 *   npm run dev            (from the repository root, in another terminal)
 *   npm run test:e2e
 *
 * E2E_BASE_URL   website URL (default http://localhost:4200)
 * E2E_API_URL    API URL used to verify saved records (default http://localhost:3000)
 * PW_CHANNEL     use an installed browser instead of Playwright's Chromium, e.g. "chrome" or "msedge"
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4200';
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } }, testIgnore: /(screenshots|mobile)\.spec/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel }, testMatch: /mobile\.spec/ },
    { name: 'screenshots', use: { ...devices['Desktop Chrome'], channel }, testMatch: /screenshots\.spec/ },
  ],
});
