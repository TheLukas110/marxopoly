import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

if (existsSync('.env.e2e.local')) process.loadEnvFile('.env.e2e.local');

const baseURL = process.env.E2E_BASE_URL?.trim();
const basicAuthUser = process.env.E2E_BASIC_AUTH_USER;
const basicAuthPass = process.env.E2E_BASIC_AUTH_PASS;

if (!baseURL) throw new Error('E2E_BASE_URL is required for the live browser test.');

const parsedBaseURL = new URL(baseURL);
if (parsedBaseURL.protocol !== 'https:' || parsedBaseURL.username || parsedBaseURL.password
  || parsedBaseURL.search || parsedBaseURL.hash) {
  throw new Error('E2E_BASE_URL must be a public HTTPS URL without credentials, query or fragment.');
}
if (!basicAuthUser || !basicAuthPass) {
  throw new Error('E2E_BASIC_AUTH_USER and E2E_BASIC_AUTH_PASS are required for the live browser test.');
}

export default defineConfig({
  testDir: './packages/client/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    httpCredentials: { username: basicAuthUser, password: basicAuthPass },
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium-live', use: { ...devices['Desktop Chrome'] } }],
});
