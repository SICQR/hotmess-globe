/**
 * auth.ts
 * Helper functions for authentication flows in E2E tests
 */

import { Page, expect } from '@playwright/test';

const TEST_USER_A = {
  email: process.env.TEST_USER_A_EMAIL ?? 'test-red@hotmessldn.com',
  password: process.env.TEST_USER_A_PASSWORD ?? 'Hotmess2026!',
};

const TEST_USER_B = {
  email: process.env.TEST_USER_B_EMAIL ?? 'test-blue@hotmessldn.com',
  password: process.env.TEST_USER_B_PASSWORD ?? 'Hotmess2026!',
};

/**
 * Sets localStorage flags to bypass age gate and onboarding.
 * Called before navigating to ensure gates don't block the test.
 */
export async function bypassGates(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    // Community attestation flag — required for BootGuard error-path fallback.
    // Without this, if loadProfile fails the error handler falls to NEEDS_COMMUNITY_GATE.
    localStorage.setItem('hm_community_attested_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });
}

/**
 * Navigates to /auth, opens the sign-in sheet (Auth.jsx renders a landing page;
 * the form is inside an AnimatePresence bottom sheet toggled by "I'm already filthy"),
 * fills email + password, submits, waits for redirect to /.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/auth', { waitUntil: 'commit', timeout: 30_000 });

  // Auth.jsx is a landing page — the sign-in form is inside a bottom sheet.
  // BootGuard starts in LOADING state; wait for Auth.jsx to fully render before interacting.
  // isVisible() does NOT wait — use waitFor({ state: 'visible' }) instead.
  const signinCta = page.locator(
    "button:has-text(\"I'm already filthy\"), button:has-text('Sign in')"
  ).first();
  await signinCta.waitFor({ state: 'visible', timeout: 20_000 });
  await signinCta.click();
  // Wait for the bottom sheet spring animation to settle
  await page.waitForTimeout(600);

  // Fill email field — now inside the open bottom sheet
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(email);

  // Fill password field
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible', timeout: 5_000 });
  await passwordInput.fill(password);

  // Submit — look for type=submit first, then text-based fallbacks
  const submitButton = page.locator('button[type="submit"]').first();
  await submitButton.waitFor({ state: 'visible', timeout: 5_000 });
  await submitButton.click();

  // Wait for BootGuard to redirect to / after successful auth
  await expect(page).toHaveURL('/', { timeout: 30_000 });

  // BootGuard transitions LOADING → READY after auth; wait for the OS bottom nav
  // to confirm the app shell is mounted before proceeding
  await page.locator('nav').first().waitFor({ state: 'visible', timeout: 30_000 });
}

/**
 * Combines bypassGates + loginAs for User A.
 * Call before starting authenticated tests.
 */
export async function setupUserA(page: Page): Promise<void> {
  await bypassGates(page);
  await loginAs(page, TEST_USER_A.email, TEST_USER_A.password);
}

/**
 * Combines bypassGates + loginAs for User B.
 * Call before starting authenticated tests with a second user.
 */
export async function setupUserB(page: Page): Promise<void> {
  await bypassGates(page);
  await loginAs(page, TEST_USER_B.email, TEST_USER_B.password);
}
