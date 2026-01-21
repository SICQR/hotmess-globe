import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load .env files for local Playwright runs.
// - CI typically injects env vars already; we do not override those.
// - Locally, .env.local should take precedence over .env.
try {
  dotenv.config({ override: false });

  const envLocalUrl = new URL('./.env.local', import.meta.url);
  const envLocalPath = fileURLToPath(envLocalUrl);
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: true });
  }
} catch {
  // Best-effort: tests can still run with env vars injected by the shell/CI.
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html']] : [['list'], ['html']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev:loopback',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
