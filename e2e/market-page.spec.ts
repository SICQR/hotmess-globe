/**
 * market-page.spec.ts
 *
 * E2E tests for the Market mode.
 * Named market-page.spec.ts to avoid collision with existing marketplace.spec.ts.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });
});


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe('Market page', () => {
  test('market page renders without crashing', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      const msg = String(err);
      if (
        msg.includes('WebSocket') ||
        msg.includes('ResizeObserver') ||
        msg.includes('Non-Error promise rejection') ||
        msg.includes('supabase') ||
        msg.includes('shopify')
      ) return;
      pageErrors.push(msg);
    });

    await page.goto('/market', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors, `Page errors on /market:\n${pageErrors.join('\n')}`).toHaveLength(0);
  });

  test('market page has source tabs or navigation elements', async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    // Wait for lazy-loaded content
    await page.waitForTimeout(1500);

    // The market should have tabs, buttons, or navigation for the 3 commerce streams
    const hasTabs = await page.locator('[role="tablist"]').first().isVisible().catch(() => false);
    const hasButtons = await page.locator('button').first().isVisible().catch(() => false);
    const hasInput = await page.locator('input').first().isVisible().catch(() => false);

    expect(hasTabs || hasButtons || hasInput).toBe(true);
  });

  test('market page shows empty state gracefully when no products', async ({ page }) => {
    await page.goto('/market', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    // Wait for data to load or empty state to appear
    await page.waitForTimeout(2000);

    // Either products are shown OR an empty/loading state — never a crash
    const bodyText = await page.locator('body').textContent();
    // Body should have some content (not empty)
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test('market page is accessible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/market', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    // No horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 5;
    });
    expect(hasOverflow).toBe(false);
  });
});
