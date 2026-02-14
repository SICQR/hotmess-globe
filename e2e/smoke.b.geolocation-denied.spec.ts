import { test, expect } from '@playwright/test';

// B = geolocation denied/unavailable (privacy path).

test('B: directions page renders and shows location guidance when geo denied', async ({ page, context }) => {
  // Ensure we do NOT grant geolocation permission.
  await context.clearPermissions();

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // Bypass session-based AgeGate.
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });

  await page.goto('/directions?lat=51.5074&lng=-0.1278&label=Test&mode=foot');

  await expect(page.getByText('Directions to Test')).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();

  // One of these should appear depending on browser behavior.
  const guidance = page
    .getByText(/Enable location to see turn-by-turn steps\.|Unable to get your location\.|permission/i)
    .first();
  await expect(guidance).toBeVisible();

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});

// This catches regressions like TDZ crashes, abort crashes, etc.

test('B: profile route does not hard-crash', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // Bypass session-based AgeGate.
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });

  // Use the legacy /Profile route (auto-generated) since it exists in this app.
  await page.goto('/Profile?uid=2d55a74f-e01a-4735-b830-c7dba21fdb4f');

  // App should render something (even if user not found / redirects).
  await expect(page.locator('body')).toBeVisible();

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});
