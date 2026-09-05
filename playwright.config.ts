import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.NEXUS_TEST_URL || 'http://localhost:3000',
    channel: process.env.NEXUS_BROWSER_CHANNEL === 'chromium' ? undefined : 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: 'list',
});
