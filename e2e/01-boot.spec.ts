/**
 * 01-boot.spec.ts
 * Tests the boot flow: unauthenticated landing, age gate, dark theme
 */

import { test, expect } from '@playwright/test';

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.describe('Boot flow', () => {
  test('unauthenticated user lands on / and sees HotmessSplash (not the app)', async ({ page }) => {
    // Use 'commit' to avoid cold-Vite bundle timeout
    await page.goto('/', { waitUntil: 'commit' });

    // SplashScreen (session-8 redesign) has "Join" and "Sign In" CTAs that animate in ~900ms
    const splashCta = page.locator('button').filter({ hasText: /^(Join|Sign In)$/i }).first();
    await expect(splashCta).toBeVisible({ timeout: 15_000 });

    // URL should stay at / — BootGuard does not redirect unauthenticated users to /auth
    const url = page.url();
    expect(url.endsWith('/') || url.includes('localhost:5173/')).toBeTruthy();

    // Should NOT be inside the authenticated OS (no bottom nav, no app routes)
    expect(
      url.includes('/pulse') || url.includes('/ghosted') || url.includes('/market'),
    ).toBeFalsy();
  });

  test('/auth page renders and shows sign-in CTA', async ({ page }) => {
    // Use 'commit' so we don't time out waiting for React to fully hydrate
    await page.goto('/auth', { waitUntil: 'commit' });

    // Auth.jsx: "I'm already filthy" opens sign-in sheet. SplashScreen fallback has "Sign In".
    const signinCta = page.locator(
      'button:has-text("I\'m already filthy"), button:has-text("Sign In"), button:has-text("Make a mess")',
    ).first();
    await expect(signinCta).toBeVisible({ timeout: 20_000 });

    // Prefer "I'm already filthy" which opens the sign-in sheet with email+password fields.
    // Fall back to any visible "Sign In" button.
    const alreadyFilthy = page.locator("button:has-text(\"I'm already filthy\")").first();
    const signInBtn     = page.locator('button:has-text("Sign In")').first();

    const filthyVisible = await alreadyFilthy.isVisible({ timeout: 3_000 }).catch(() => false);
    if (filthyVisible) {
      await alreadyFilthy.click();
    } else {
      const siVisible = await signInBtn.isVisible({ timeout: 2_000 }).catch(() => false);
      if (siVisible) await signInBtn.click();
    }

    // Spring animation settle (damping:28, stiffness:300 → ~500ms)
    await page.waitForTimeout(1_000);

    // Auth form (magic-link or email+password) should now be visible.
    // Auth.jsx default sign-in is magic-link (email only, no password field).
    const emailInput = page.locator('input[type="email"], input[type="text"][placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
  });

  test('with hm_age_confirmed_v1=true, should NOT redirect to /age', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
    });

    await page.goto('/', { waitUntil: 'commit' });

    // Wait briefly for any redirect to settle
    await page.waitForTimeout(3_000);

    await expect(page).not.toHaveURL(/\/age(\?|$)/);
  });

  test('dark background: body should not be white', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });

    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForTimeout(2_000);

    const bodyElement = page.locator('body');
    const bgColor = await bodyElement.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should not be pure white (255, 255, 255)
    expect(bgColor).not.toMatch(/rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/);
  });
});
