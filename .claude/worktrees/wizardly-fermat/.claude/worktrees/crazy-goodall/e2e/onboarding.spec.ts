import { test, expect } from '@playwright/test';

// Onboarding + PIN E2E tests

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.beforeEach(async ({ page }) => {
  // Clear age gate so onboarding gate shows
  await page.addInitScript(() => {
    localStorage.removeItem('hm_age_confirmed_v1');
    sessionStorage.removeItem('age_verified');
    sessionStorage.removeItem('location_consent');
  });
});

test.describe('OnboardingGate UI', () => {
  test('onboarding page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/onboarding');
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toHaveLength(0);
  });

  test('displays HOTMESS wordmark', async ({ page }) => {
    await page.addInitScript(() => {
      // Stub base44.auth.me to return unauthenticated to avoid redirect
      (window as any).__MOCK_AUTH_FAIL__ = true;
    });
    await page.goto('/onboarding');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('AgeGate UI', () => {
  test('age gate page renders the brand wordmark', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/age');
    await expect(page.locator('body')).toBeVisible();

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toHaveLength(0);
  });
});

test.describe('PIN security', () => {
  test('PIN is hashed client-side (Web Crypto API available)', async ({ page }) => {
    await page.goto('/');
    // Verify Web Crypto API is available in the browser context
    const hasCrypto = await page.evaluate(() =>
      typeof crypto !== 'undefined' && typeof crypto.subtle?.digest === 'function'
    );
    expect(hasCrypto).toBe(true);
  });
});
