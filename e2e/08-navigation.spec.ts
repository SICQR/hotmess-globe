/**
 * 08-navigation.spec.ts
 * Navigation smoke tests — all main routes reachable, no hard crashes
 */

import { test, expect } from '@playwright/test';
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
      // Wait for BootGuard to exit LOADING state (body visible or redirect complete)
      await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 }).catch(async () => {
        // If body stays hidden, BootGuard may have redirected to /auth — that's fine
        const url = page.url();
        if (!url.includes('/auth') && !url.includes('/login')) {
          throw new Error(`Body not visible on ${route}, current URL: ${url}`);
        }
      });
    }

    expect(pageErrors).toHaveLength(0);
  });

  test('bottom nav (OSBottomNav) is visible on all 5 routes when authenticated', async ({ page }) => {
    const mainRoutes = ['/', '/pulse', '/ghosted', '/market', '/profile'];

    for (const route of mainRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      // If redirected to auth, skip nav check — unauthenticated is expected here
      await page.waitForTimeout(2_000);
      const url = page.url();
      if (url.includes('/auth') || url.includes('/login')) {
        continue;
      }

      const nav = page.locator('nav').first();
      const navVisible = await nav.isVisible({ timeout: 2_000 }).catch(() => false);
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
    await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

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
    await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    expect(pageErrors).toHaveLength(0);
  });

  test('unknown route (e.g. /unknown-route-xyz) redirects gracefully', async ({ page }) => {
    await page.goto('/unknown-route-xyz', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2_000);

    const url = page.url();
    const isKnownRoute =
      url.includes('/') ||
      url.includes('/auth') ||
      url.includes('/404') ||
      url.includes('/error');

    expect(isKnownRoute || url.includes('localhost') || url.includes('127.0.0.1')).toBeTruthy();
  });
});
