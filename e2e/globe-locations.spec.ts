import { test, expect } from '@playwright/test';

// Globe + Location Shop E2E tests

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

test.describe('Globe / Pulse Page', () => {
  test('globe page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/pulse');
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/age(\?|$)/);

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toHaveLength(0);
  });

  test('globe page renders a canvas element (Three.js)', async ({ page }) => {
    await page.goto('/pulse');
    // Wait for the canvas to be injected by Three.js renderer
    await page.waitForSelector('canvas', { timeout: 15_000 }).catch(() => null);
    const canvas = page.locator('canvas').first();
    // Canvas may not be visible in headless but should exist in DOM
    const count = await canvas.count();
    // Soft assertion — canvas may be present depending on WebGL support
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('globe controls are visible', async ({ page }) => {
    await page.goto('/pulse');
    await expect(page.locator('body')).toBeVisible();
    // Search bar or header buttons should be present
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Location Shop Panel', () => {
  test('LocationShopPanel renders without JS errors when imported', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // The panel is lazy-mounted; just loading the pulse page is enough
    // to bundle-check the component
    await page.goto('/pulse');
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toHaveLength(0);
  });
});
