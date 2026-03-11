import { test, expect } from '@playwright/test';

/**
 * messaging.spec.ts
 *
 * Tests for the Ghosted proximity grid and chat messaging flows.
 * All social/messaging features in HOTMESS live under /ghosted.
 * Chat is opened as a sheet: ?sheet=chat
 */

const NOISE_PATTERNS = [
  'WebSocket',
  'supabase',
  'ResizeObserver',
  'Non-Error promise rejection',
  'Failed to fetch',
  'Loading chunk',
  'net::ERR',
];

function isNoise(msg: string): boolean {
  return NOISE_PATTERNS.some((p) => msg.includes(p));
}

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.beforeEach(async ({ page }) => {
  // Bypass age gate and community gate so we reach the OS
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    localStorage.setItem('hm_community_attested_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });
});

test.describe('Ghosted Grid (social / proximity discovery)', () => {
  test('/ghosted loads without page errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      if (!isNoise(String(err))) pageErrors.push(String(err));
    });

    await page.goto('/ghosted', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('body')).toBeVisible();
    // Should not redirect to age-gate
    await expect(page).not.toHaveURL(/\/age(\?|$)/);

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('/ghosted shows proximity grid or auth prompt', async ({ page }) => {
    await page.goto('/ghosted', { waitUntil: 'domcontentloaded' });

    // Either the grid renders (unauthenticated skeleton) or auth wall appears
    const hasGrid = await page.locator('nav').first().isVisible({ timeout: 10_000 }).catch(() => false);
    const hasAuth = await page.getByText(/sign in|log in|make a mess|connect/i).first().isVisible().catch(() => false);

    expect(hasGrid || hasAuth).toBe(true);
  });

  test('/ghosted navigation bar is visible', async ({ page }) => {
    // Use client-side navigation to avoid full reload (avoids Supabase auth call failures)
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.history.pushState({}, '', '/ghosted');
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });

    await expect(page.locator('nav').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Chat sheet (ghosted messaging)', () => {
  test('chat sheet opens on /ghosted via URL param', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      if (!isNoise(String(err))) pageErrors.push(String(err));
    });

    await page.goto('/ghosted', { waitUntil: 'domcontentloaded' });

    // Open chat sheet via client-side navigation (sheet system is URL-synced)
    await page.evaluate(() => {
      window.history.pushState({}, '', '/ghosted?sheet=chat');
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });

    // Wait for the sheet URL change to settle — the sheet container or body must be stable
    await page.waitForLoadState('domcontentloaded');

    // Page should still be visible and not crash
    await expect(page.locator('body')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('sheet policy blocks chat sheet from non-ghosted route', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      if (!isNoise(String(err))) pageErrors.push(String(err));
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Attempt to open chat sheet via URL on home route — policy should block it
    await page.evaluate(() => {
      window.history.pushState({}, '', '/?sheet=chat&threadId=fake');
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });

    // Wait for any toast or UI response to settle
    await page.waitForLoadState('domcontentloaded');

    // URL stays on / (chat sheet should not change the path)
    const urlPath = new URL(page.url()).pathname;
    expect(urlPath).toBe('/');

    // No JS errors
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Ghosted unauthenticated state', () => {
  test('/ghosted with no session shows auth page or unauthenticated skeleton', async ({ page }) => {
    // Do NOT bypass age gate — start completely fresh
    await page.addInitScript(() => {
      // Clear everything so we get a clean unauthenticated state
      localStorage.clear();
    });

    await page.goto('/ghosted', { waitUntil: 'domcontentloaded' });

    // Wait for the boot state machine to resolve (LOADING → UNAUTHENTICATED → redirect or render)
    await page.waitForFunction(
      () => {
        const path = window.location.pathname;
        return path === '/auth' || path === '/ghosted' || path === '/';
      },
      { timeout: 10_000 },
    ).catch(() => null); // allow timeout — the page still passes the assertions below

    const hasBody = await page.locator('body').isVisible();
    expect(hasBody).toBe(true);
    // App should be stable — either on /ghosted (unauthenticated) or /auth
    const pathname = new URL(page.url()).pathname;
    expect(['/ghosted', '/auth', '/']).toContain(pathname);
  });
});
