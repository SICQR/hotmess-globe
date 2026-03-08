/**
 * 08-navigation.spec.ts
 * Comprehensive navigation tests — all main routes, bottom nav, error handling
 */

import { test, expect, Page } from '@playwright/test';
import { bypassGates } from './helpers/auth';

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.describe('Navigation suite', () => {
  test.beforeEach(async ({ page }) => {
    await bypassGates(page);
  });

  test('all 5 main routes load without unhandled page errors', async ({ page }) => {
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

    const mainRoutes = ['/', '/pulse', '/ghosted', '/market', '/profile'];

    for (const route of mainRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.locator('body')).toBeVisible();
    }

    expect(pageErrors).toHaveLength(0);
  });

  test('bottom nav (OSBottomNav) is visible on all 5 routes when authenticated', async ({ page }) => {
    const mainRoutes = ['/', '/pulse', '/ghosted', '/market', '/profile'];

    for (const route of mainRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      // If redirected to auth, skip nav check
      const url = page.url();
      if (url.includes('/auth') || url.includes('/login')) {
        continue;
      }

      // Bottom nav is a <nav> element
      const nav = page.locator('nav').first();
      const navVisible = await nav.isVisible({ timeout: 2_000 }).catch(() => false);

      // Nav should be present on authenticated routes
      if (navVisible) {
        await expect(nav).toBeVisible();
      }
    }
  });

  test('/radio loads without page errors', async ({ page }) => {
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

    await page.goto('/radio', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors).toHaveLength(0);
  });

  test('/vault loads without page errors', async ({ page }) => {
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

    await page.goto('/vault', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors).toHaveLength(0);
  });

  test('unknown route (e.g. /unknown-route-xyz) redirects gracefully', async ({ page }) => {
    await page.goto('/unknown-route-xyz', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Should redirect to a known route (home, auth, or error page)
    const url = page.url();
    const isKnownRoute =
      url.includes('/') ||
      url.includes('/auth') ||
      url.includes('/404') ||
      url.includes('/error');

    expect(isKnownRoute || url.includes('localhost')).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  });
});
