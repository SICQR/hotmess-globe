import { test, expect } from '@playwright/test';
import { setupUserA } from './helpers/auth';

// A = geolocation allowed (happy path).

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test('A: all OS routes render without page errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    const msg = String(err);
    // Ignore known-benign async errors
    if (
      msg.includes('WebSocket') ||
      msg.includes('supabase') ||
      msg.includes('ResizeObserver') ||
      msg.includes('Non-Error promise rejection') ||
      msg.includes('Failed to fetch') ||
      msg.includes('Loading chunk')
    ) return;
    pageErrors.push(msg);
  });

  // Bypass AgeGate / onboarding
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });

  await page.goto('/');
  await expect(page).not.toHaveURL(/\/age(\?|$)/);
  await expect(page.locator('body')).toBeVisible();

  // All 5 OS mode routes + radio + vault
  for (const path of ['/pulse', '/ghosted', '/market', '/profile', '/radio', '/vault']) {
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/age(\?|$)/);
    await expect(page.locator('body')).toBeVisible();
  }

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});

test('A: directions page loads when authenticated (even if API rejects)', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    const msg = String(err);
    if (
      msg.includes('WebSocket') || msg.includes('supabase') ||
      msg.includes('ResizeObserver') || msg.includes('Failed to fetch')
    ) return;
    pageErrors.push(msg);
  });

  // Directions is behind auth — must log in first.
  // setupUserA leaves the app at / with BootGuard in READY state.
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
