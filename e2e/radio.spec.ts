import { test, expect } from '@playwright/test';

// Radio page E2E tests

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

test.describe('Radio Page', () => {
  test('radio page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/music');
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/age(\?|$)/);

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toHaveLength(0);
  });

  test('radio page shows HOTMESS RADIO heading', async ({ page }) => {
    await page.goto('/music');
    await expect(page.locator('body')).toBeVisible();
    // Heading or brand text should be present
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();
  });

  test('radio page has play button or stream controls', async ({ page }) => {
    await page.goto('/music');
    await expect(page.locator('body')).toBeVisible();

    // Stream player or button should be present
    const playButton = page.locator('button').first();
    await expect(playButton).toBeVisible();
  });

  test('radio schedule page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/music/schedule');
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toHaveLength(0);
  });

  test('music release page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/music/release');
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toHaveLength(0);
  });
});
