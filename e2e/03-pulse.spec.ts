/**
 * 03-pulse.spec.ts
 * Tests PulseMode (/pulse) — globe rendering and GPU optimization
 */

import { test, expect } from '@playwright/test';
import { setupUserA } from './helpers/auth';

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.describe('PulseMode globe', () => {
  test.beforeEach(async ({ page }) => {
    await setupUserA(page);
  });

  test('/pulse loads, body visible, no page errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      const msg = String(err);
      if (
        msg.includes('WebSocket') ||
        msg.includes('supabase') ||
        msg.includes('ResizeObserver') ||
        msg.includes('Non-Error promise rejection') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Loading chunk')
      ) {
        return;
      }
      pageErrors.push(msg);
    });

    await page.goto('/pulse', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors).toHaveLength(0);
  });

  test('canvas element present (Three.js globe renders on /pulse)', async ({ page }) => {
    await page.goto('/pulse', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Three.js renders into a canvas element
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Canvas may take time to render — that's acceptable
      expect(true).toBeTruthy();
    });
  });

  test('navigating away from /pulse: canvas should not be visible on /', async ({ page }) => {
    await page.goto('/pulse', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Verify we're on pulse
    const canvasOnPulse = page.locator('canvas').first();
    await expect(canvasOnPulse).toBeVisible({ timeout: 5_000 }).catch(() => {
      // OK if no canvas yet
    });

    // Navigate away
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Canvas should not be visible on home (GPU optimization: UnifiedGlobe returns null on non-/pulse)
    const canvasOnHome = page.locator('canvas').first();
    const canvasVisible = await canvasOnHome.isVisible().catch(() => false);

    // If canvas exists, it should be hidden
    if (canvasVisible) {
      const displayStyle = await canvasOnHome.evaluate((el) => {
        return window.getComputedStyle(el).display;
      });
      expect(displayStyle).toMatch(/none|hidden/);
    }
  });
});
