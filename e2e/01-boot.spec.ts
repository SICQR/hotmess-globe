/**
 * 01-boot.spec.ts
 * Tests the boot flow: unauthenticated landing, age gate, dark theme
 */

import { test, expect } from '@playwright/test';

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.describe('Boot flow', () => {
  test('unauthenticated user lands on / and redirects to /auth', async ({ page }) => {
    // Do NOT set hm_age_confirmed_v1 — test the natural flow
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Should redirect to auth or show age gate
    const url = page.url();
    expect(url.includes('/auth') || url.includes('/age')).toBeTruthy();
  });

  test('/auth page renders with email and password fields', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Email and password inputs should be visible
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('with hm_age_confirmed_v1=true, should NOT redirect to /age', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Should not be on /age route
    await expect(page).not.toHaveURL(/\/age(\?|$)/);
  });

  test('dark background: body should not be white', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const bodyElement = page.locator('body');
    const bgColor = await bodyElement.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should not be pure white (255, 255, 255)
    expect(bgColor).not.toMatch(/rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/);
  });
});
