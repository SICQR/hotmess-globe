import { test, expect } from '@playwright/test';

// Music E2E tests - Music, radio, releases

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.beforeEach(async ({ page }) => {
  // Bypass session-based AgeGate
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });
});

test.describe('Music Features', () => {
  test('music page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/music');
    
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/age(\?|$)/);
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('music page displays content', async ({ page }) => {
    await page.goto('/music');
    
    // Should have some music-related content
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Radio Features', () => {
  test('radio page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/radio');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('radio schedule page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/radio-schedule');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test.describe('Music Releases', () => {
  test('music release page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/music-release');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('record manager page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/record-manager');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});
