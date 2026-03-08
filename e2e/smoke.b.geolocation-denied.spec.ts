import { test, expect } from '@playwright/test';

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

  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });

  await page.goto('/directions?lat=51.5074&lng=-0.1278&label=Test&mode=foot');

  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 });

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

  // App should render something (may redirect to /auth if unauthenticated)
  await expect(page.locator('body')).toBeVisible();

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});
