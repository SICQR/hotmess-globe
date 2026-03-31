/**
 * auth.ts
 * Helper functions for authentication flows in E2E tests
 */

import { Page, test } from '@playwright/test';

// When PROD=true, use production Supabase project; otherwise dev
const IS_PROD = process.env.PROD === 'true';

const SUPABASE_URL = IS_PROD
  ? 'https://rfoftonnlwudilafhfkl.supabase.co'
  : (process.env.VITE_SUPABASE_URL ?? 'https://klsywpvncqqglhnhrjbh.supabase.co');

const SUPABASE_ANON_KEY = IS_PROD
  ? (process.env.PROD_SUPABASE_ANON_KEY ?? '')
  : (process.env.VITE_SUPABASE_ANON_KEY ?? '');

// Derived from project ref: sb-<ref>-auth-token
// Confirmed via: createClient(url, key).auth.storageKey
const SUPABASE_STORAGE_KEY = IS_PROD
  ? `sb-rfoftonnlwudilafhfkl-auth-token`
  : `sb-klsywpvncqqglhnhrjbh-auth-token`;

const TEST_USER_A = {
  // When PROD=true, use the production test user; otherwise use dev test user
  email: IS_PROD ? 'e2e.alpha@hotmessldn.com' : (process.env.TEST_USER_A_EMAIL || 'test-red@hotmessldn.com'),
  password: IS_PROD ? '***REMOVED_PASSWORD***' : (process.env.TEST_USER_A_PASSWORD || '***REMOVED_PASSWORD***'),
};

const TEST_USER_B = {
  email: IS_PROD ? 'e2e.beta@hotmessldn.com' : (process.env.TEST_USER_B_EMAIL || 'test-blue@hotmessldn.com'),
  password: IS_PROD ? '***REMOVED_PASSWORD***' : (process.env.TEST_USER_B_PASSWORD || '***REMOVED_PASSWORD***'),
};

/**
 * True only when all secrets required for authenticated tests are present and non-empty.
 * For PROD (rfoftonnlwudilafhfkl), check for PROD_SUPABASE_ANON_KEY env var.
 * For DEV (klsywpvncqqglhnhrjbh), use VITE_SUPABASE_ANON_KEY.
 */
export const E2E_AUTH_CONFIGURED =
  IS_PROD
    ? !!(process.env.PROD_SUPABASE_ANON_KEY?.trim())
    : !!(process.env.VITE_SUPABASE_ANON_KEY?.trim()) &&
        !!(process.env.TEST_USER_A_EMAIL?.trim()) &&
        !!(process.env.TEST_USER_A_PASSWORD?.trim());

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
 * Fetches a Supabase session token via the REST API (no browser UI interaction).
 * Injects it directly into localStorage so BootGuard sees an authenticated session
 * on the very first page load — no form interaction, no animation waits, no redirects.
 *
 * This is the CI-safe approach: avoids fragile UI form filling and network
 * timing issues with the auth bottom sheet.
 *
 * When E2E auth secrets are not configured the test is skipped cleanly rather
 * than hard-failing with a 400 from Supabase.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  // Skip gracefully when auth secrets are missing — avoids hard CI failures
  // caused by blank/default credentials being sent to Supabase.
  if (!E2E_AUTH_CONFIGURED) {
    test.skip(true, 'Skipping authenticated test - VITE_SUPABASE_ANON_KEY / TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD not configured.');
    return;
  }

  // 1. Get session token via Playwright's request API (Node.js context, not browser)
  const response = await page.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: { email, password },
      timeout: 15_000,
    }
  );

  const session = await response.json();
  if (!session.access_token) {
    throw new Error(`Supabase auth failed for ${email}: ${JSON.stringify(session)}`);
  }

  // 2. Inject the session into localStorage before first page load.
  //    Supabase client reads this key on init → BootGuard gets SIGNED_IN immediately.
  const sessionPayload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    expires_in: session.expires_in ?? 3600,
    token_type: 'bearer',
    user: session.user,
  };

  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: SUPABASE_STORAGE_KEY, value: sessionPayload });

  // 3. Navigate to the app — BootGuard picks up the session from localStorage
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30_000 });

  // 4. Wait for BootGuard READY — nav visible = app shell fully mounted
  await page.locator('nav').first().waitFor({ state: 'visible', timeout: 30_000 });
}

/**
 * Combines bypassGates + loginAs for User A.
 */
export async function setupUserA(page: Page): Promise<void> {
  await bypassGates(page);
  await loginAs(page, TEST_USER_A.email, TEST_USER_A.password);
}

/**
 * Combines bypassGates + loginAs for User B.
 */
export async function setupUserB(page: Page): Promise<void> {
  await bypassGates(page);
  await loginAs(page, TEST_USER_B.email, TEST_USER_B.password);
}
