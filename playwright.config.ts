import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    browserName: 'chromium',
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
    baseURL: 'http://127.0.0.1:3000',
  },
  webServer: {
    command: 'next dev --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
