import { test, expect } from '@playwright/test';

// A = geolocation allowed (happy path).

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test('A: core routes render without page errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // Bypass session-based AgeGate.
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });

  await page.goto('/');
  await expect(page).not.toHaveURL(/\/age(\?|$)/);
  await expect(page.locator('body')).toBeVisible();

  // Canonical V1.5 routes (smoke)
  for (const path of ['/pulse', '/events', '/market', '/social', '/music', '/more']) {
    await page.goto(path);
    await expect(page).not.toHaveURL(/\/age(\?|$)/);
    await expect(page.locator('body')).toBeVisible();
  }

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});

test('A: directions page loads (even if API rejects)', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // Bypass session-based AgeGate.
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });

  await page.goto('/directions?lat=51.5074&lng=-0.1278&label=Test&mode=foot');

  await expect(page.getByText('Directions to Test')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Foot' })).toBeVisible();

  // Leaflet container should mount.
  await expect(page.locator('.leaflet-container')).toBeVisible();

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});
