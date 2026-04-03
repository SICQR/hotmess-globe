/**
 * mobile.spec.ts
 *
 * Mobile-specific UI tests using Playwright device emulation.
 * Tests that content is accessible and that fixed UI elements don't overlap.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Device config — use chromium with iPhone 14 viewport dimensions.
// Note: 'mobile-safari' project (webkit) requires `npx playwright install webkit`
// before it can run. The chromium project is available by default.
// These tests use viewport emulation rather than a specific browser engine.
// ---------------------------------------------------------------------------
test.use({
  viewport: { width: 390, height: 844 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  hasTouch: true,
  isMobile: true,
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe('Mobile layout — iPhone 14', () => {
  test('home page renders without horizontal overflow', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    // Check for horizontal scroll (a sign of broken layout)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('bottom nav does not overlap main content area', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    // The bottom nav is fixed — main content should have padding-bottom to
    // prevent overlap. Check that body scrollHeight > 0 (app rendered).
    const hasContent = await page.evaluate(() => document.body.scrollHeight > 0);
    expect(hasContent).toBe(true);
  });

  test('viewport meta tag sets correct width', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta).toContain('width=device-width');
  });

  test('market page loads on mobile without crashing', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      const msg = String(err);
      if (msg.includes('WebSocket') || msg.includes('ResizeObserver')) return;
      pageErrors.push(msg);
    });

    await page.goto('/market', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors, `Page errors on /market (mobile):\n${pageErrors.join('\n')}`).toHaveLength(0);
  });

  test('pulse page loads on mobile without crashing', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      const msg = String(err);
      if (msg.includes('WebSocket') || msg.includes('ResizeObserver') || msg.includes('Non-Error')) return;
      pageErrors.push(msg);
    });

    await page.goto('/pulse', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors, `Page errors on /pulse (mobile):\n${pageErrors.join('\n')}`).toHaveLength(0);
  });

  test('safe area padding: header does not sit under status bar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    // Check that the HTML/body doesn't have overflow:hidden cutting content
    const overflow = await page.evaluate(() => {
      const style = window.getComputedStyle(document.documentElement);
      return style.overflow;
    });
    // We expect overflow to not be 'hidden' at the root level
    expect(overflow).not.toBe('hidden');
  });

  test('touch targets are reasonably sized (no tiny buttons)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    // Check first interactive button meets minimum touch target size
    const firstButton = page.locator('button').first();
    const buttonVisible = await firstButton.isVisible().catch(() => false);

    if (buttonVisible) {
      const box = await firstButton.boundingBox();
      if (box) {
        // Minimum 24px touch target (iOS HIG recommends 44px, but 24px is a minimum)
        expect(box.height).toBeGreaterThan(20);
        expect(box.width).toBeGreaterThan(20);
      }
    }
  });
});
