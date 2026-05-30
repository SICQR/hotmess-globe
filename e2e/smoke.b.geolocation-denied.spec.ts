import { test, expect } from '@playwright/test';
import { setupUserA } from './helpers/auth';

// B = geolocation denied/unavailable (privacy path).

test('B: directions page renders when geo denied', async ({ page, context }) => {
  await context.clearPermissions();

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    const msg = String(err);
    if (msg.includes('WebSocket') || msg.includes('supabase') ||
        msg.includes('ResizeObserver') || msg.includes('Failed to fetch')) return;
    pageErrors.push(msg);
  });

  // Directions is behind auth — must log in first (with geo still denied)
  await setupUserA(page);

  // Use React Router client-side navigation (pushState + popstate) instead of
  // page.goto() which does a full page reload and re-runs Supabase getUser(),
  // which can fail with "Failed to fetch" in headless Playwright contexts.
  await page.evaluate(() => {
    const url = '/directions?lat=51.5074&lng=-0.1278&label=Test&mode=foot';
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  });

  // Leaflet container should mount (React Router navigated, BootGuard stays READY)
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 20_000 });

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});

test('B: /profile route does not hard-crash (unauthenticated redirects gracefully)', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    const msg = String(err);
    if (msg.includes('WebSocket') || msg.includes('supabase') ||
        msg.includes('ResizeObserver') || msg.includes('Failed to fetch')) return;
    pageErrors.push(msg);
  });

  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });

  await page.goto('/profile');

  // App should render something (unauthenticated → HotmessSplash at /)
  await expect(page.locator('body')).toBeVisible();

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});
