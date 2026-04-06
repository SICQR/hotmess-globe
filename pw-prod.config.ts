import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
loadDotenv({ path: '.env.local', override: false });

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '/tmp/pw-results',
  use: {
    baseURL: 'https://hotmessldn.com',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
