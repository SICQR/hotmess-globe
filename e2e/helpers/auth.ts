/**
 * auth.ts
 * Helper functions for authentication flows in E2E tests
 */

import { Page, expect } from '@playwright/test';

const TEST_USER_A = {
  email: 'test-red@hotmess.test',
  password: 'Hotmess2026!',
};

const TEST_USER_B = {
  email: 'test-blue@hotmess.test',
  password: 'Hotmess2026!',
};

/**
 * Sets localStorage flags to bypass age gate and onboarding.
 * Called before navigating to ensure gates don't block the test.
 */
export async function bypassGates(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });
}

/**
 * Navigates to /auth, fills email and password, submits, and waits for redirect to /.
 * Assumes email/password input fields are labeled or have role='textbox'/'password'.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/auth', { waitUntil: 'domcontentloaded' });

  // Fill email field
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(email);

  // Fill password field
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  // Click submit (could be button with text 'Sign in', 'Login', 'Submit', etc.)
  const submitButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), button[type="submit"]').first();
  await submitButton.click();

  // Wait for redirect to / after successful auth
  await expect(page).toHaveURL('/', { timeout: 30_000 });
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
