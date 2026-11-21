import { defineConfig, devices } from '@playwright/test';

/* iPads run WebKit, so the E2E suite does too. Note this is Playwright's
   WebKit, not Safari: it does not implement navigator.share, Home Screen
   install, or iOS storage eviction. Those stay on the manual iPad checklist
   in README.md. */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'ipad-landscape',
      use: { ...devices['iPad Pro 11 landscape'] },
    },
    {
      name: 'ipad-portrait',
      use: { ...devices['iPad Pro 11'] },
    },
  ],

  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
