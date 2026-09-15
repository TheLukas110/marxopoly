import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './packages/client/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @marxopoly/server exec tsx src/index.ts',
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NODE_ENV: 'development',
        PORT: '3001',
        CLIENT_ORIGIN: 'http://127.0.0.1:4173',
        SHARE: '0',
        SERVE_CLIENT: '0',
      },
    },
    {
      command: 'pnpm --filter @marxopoly/client exec vite --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173/visual-regression.html',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
