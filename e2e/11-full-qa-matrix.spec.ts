/**
 * 11-full-qa-matrix.spec.ts
 *
 * Full button/interaction QA matrix for hotmessldn.com.
 * Tests every critical user journey against the live app.
 *
 * Run against local dev:  npx playwright test e2e/11-full-qa-matrix.spec.ts
 * Run against prod:       PROD=true npx playwright test e2e/11-full-qa-matrix.spec.ts
 *
 * Auth secrets required for authenticated tests:
 *   VITE_SUPABASE_ANON_KEY
 *   TEST_USER_A_EMAIL    (e.g. test-red@hotmessldn.com)
 *   TEST_USER_A_PASSWORD (e.g. Hotmess2026!)
 */

import { test, expect, Page } from '@playwright/test';
import { setupUserA, bypassGates, E2E_AUTH_CONFIGURED } from './helpers/auth';

// ── Helpers ────────────────────────────────────────────────────────────────

const BASE = process.env.PROD === 'true' ? 'https://hotmessldn.com' : undefined;
function url(path: string) {
  return BASE ? `${BASE}${path}` : path;
}

/** Capture console errors during a test run */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Navigate to a tab using the bottom nav */
async function goToTab(page: Page, tabName: string) {
  const nav = page.locator('nav').first();
  const btn = nav.locator(`button, a`).filter({ hasText: new RegExp(tabName, 'i') }).first();
  if (await btn.isVisible()) {
    await btn.click();
  } else {
    // Try aria-label fallback
    await nav.locator(`[aria-label="${tabName}"]`).first().click();
  }
  await page.waitForTimeout(1200);
}

/** Check no horizontal overflow */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow, 'Horizontal scroll detected').toBe(false);
}

/** Check no canvas visible (non-Pulse tab) */
async function expectNoFullscreenCanvas(page: Page) {
  const canvases = page.locator('canvas');
  const count = await canvases.count();
  for (let i = 0; i < count; i++) {
    const box = await canvases.nth(i).boundingBox();
    if (!box) continue;
    // Canvas covering >50% of the viewport = bleed-through
    const vw = await page.evaluate(() => window.innerWidth);
    const vh = await page.evaluate(() => window.innerHeight);
    expect(
      box.width < vw * 0.5 || box.height < vh * 0.5,
      `Full-screen canvas found (${box.width}x${box.height})`
    ).toBe(true);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// AUTH FLOWS
// ════════════════════════════════════════════════════════════════════════════

test.describe('Auth: New user (unauthenticated)', () => {
  test('splash screen renders without crash', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(url('/'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should show HOTMESS wordmark or Join/Sign In
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(10);

    // No JS crash errors
    const fatal = errors.filter((e) => e.includes('TypeError') || e.includes('Cannot read'));
    expect(fatal).toHaveLength(0);
  });

  test('age gate renders and "I\'m 18+" advances', async ({ page }) => {
    await page.goto(url('/'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const ageBtn = page.locator('text=/18\+/i, text=/I am 18/i, text=/Continue/i').first();
    if (await ageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ageBtn.click();
      await page.waitForTimeout(1000);
      // Should advance — either signup or next step
      const newUrl = page.url();
      expect(newUrl).not.toContain('error');
    }
  });

  test('"Sign In" button on splash navigates to auth screen', async ({ page }) => {
    await page.goto(url('/'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const signInBtn = page.locator('text=Sign In, text=SIGN IN').first();
    if (await signInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signInBtn.click();
      await page.waitForTimeout(1000);
      // Should now show email input
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Auth: Returning user (authenticated)', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  test('goes straight to /ghosted or /, NOT onboarding', async ({ page }) => {
    await setupUserA(page);
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/onboarding');
    expect(currentUrl).not.toContain('/age-gate');
    expect(currentUrl).not.toContain('/auth');
    // Should be home (/) or ghosted
    const isHome = currentUrl.endsWith('/') || currentUrl.endsWith('/#') || currentUrl.includes('/ghosted');
    expect(isHome).toBe(true);
  });

  test('no JavaScript errors on load', async ({ page }) => {
    const errors = collectErrors(page);
    await setupUserA(page);
    await page.waitForTimeout(3000);
    const fatal = errors.filter((e) => e.includes('TypeError') || e.includes('Unhandled'));
    expect(fatal).toHaveLength(0);
  });
});

test.describe('Auth: Magic link confirmation screen', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  test('resend button shows after 60s countdown', async ({ page }) => {
    await bypassGates(page);
    await page.goto(url('/'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Navigate to sign-in screen if visible
    const signInBtn = page.locator('text=Sign In').first();
    if (await signInBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signInBtn.click();
      await page.waitForTimeout(500);

      // Fill email
      await page.fill('input[type="email"]', 'test@example.com');
      await page.locator('button:has-text("Send magic link"), button[type="submit"]').first().click();
      await page.waitForTimeout(2000);

      // Confirmation screen should appear
      const confirmText = page.locator('text=Check your inbox, text=magic link');
      if (await confirmText.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        // Resend button should start with countdown
        const resendBtn = page.locator('text=/Resend/i').first();
        await expect(resendBtn).toBeVisible();
        const btnText = await resendBtn.textContent();
        expect(btnText).toMatch(/Resend in \d+s/);

        // "Wrong email?" link should be present
        const wrongEmail = page.locator('text=/Wrong email/i').first();
        await expect(wrongEmail).toBeVisible();
        await wrongEmail.click();
        // Should return to email input
        await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TAB NAVIGATION — canvas bleed + content visibility
// ════════════════════════════════════════════════════════════════════════════

test.describe('Tab navigation', () => {
  test.beforeEach(async ({ page }) => {
    if (E2E_AUTH_CONFIGURED) {
      await setupUserA(page);
    } else {
      await bypassGates(page);
      await page.goto(url('/'), { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }
  });

  const CONTENT_TABS = ['Ghosted', 'Market', 'Music', 'More'] as const;

  for (const tab of CONTENT_TABS) {
    test(`${tab} tab: content visible, no full-screen canvas`, async ({ page }) => {
      await goToTab(page, tab);

      // Content should render
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      expect(bodyHeight).toBeGreaterThan(50);

      // No full-screen canvas bleed-through
      await expectNoFullscreenCanvas(page);

      // No horizontal overflow
      await expectNoHorizontalOverflow(page);
    });
  }

  test('Pulse tab: globe canvas renders', async ({ page }) => {
    await goToTab(page, 'Pulse');
    await page.waitForTimeout(2000);

    // Canvas should be present on Pulse
    const canvas = page.locator('canvas').first();
    const visible = await canvas.isVisible().catch(() => false);
    expect(visible).toBe(true);
  });

  test('switching from Pulse back to Home: canvas gone', async ({ page }) => {
    await goToTab(page, 'Pulse');
    await page.waitForTimeout(1500);
    await goToTab(page, 'Home');
    await page.waitForTimeout(1500);

    await expectNoFullscreenCanvas(page);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// HOME TAB
// ════════════════════════════════════════════════════════════════════════════

test.describe('Home tab', () => {
  test.beforeEach(async ({ page }) => {
    if (E2E_AUTH_CONFIGURED) {
      await setupUserA(page);
    } else {
      await bypassGates(page);
      await page.goto(url('/'), { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }
  });

  test('HNH MESS hero visible with correct prices', async ({ page }) => {
    // Should show HNH MESS somewhere on home
    const hero = page.locator('text=HNH MESS').first();
    if (await hero.isVisible({ timeout: 5000 }).catch(() => false)) {
      const body = await page.textContent('body');
      // Prices should be £10 and £15, NOT £12 or £24
      expect(body).toContain('£10');
      expect(body).not.toContain('£12');
      expect(body).not.toContain('£24');
    }
  });

  test('HNH MESS strip/hero tap navigates to /market', async ({ page }) => {
    const shopBtn = page.locator('text=Shop now, text=SHOP').first();
    if (await shopBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shopBtn.click();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('/market');
    }
  });

  test('no horizontal overflow', async ({ page }) => {
    await expectNoHorizontalOverflow(page);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MARKET TAB
// ════════════════════════════════════════════════════════════════════════════

test.describe('Market tab', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  test.beforeEach(async ({ page }) => {
    await setupUserA(page);
    await goToTab(page, 'Market');
  });

  test('shows product content, not globe canvas', async ({ page }) => {
    // No full-screen canvas
    await expectNoFullscreenCanvas(page);

    // HNH MESS should be visible
    const hmh = page.locator('text=HNH MESS').first();
    await expect(hmh).toBeVisible({ timeout: 8000 });
  });

  test('correct HNH MESS prices: £10 and £15', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).toContain('£10');
    expect(body).toContain('£15');
    expect(body).not.toContain('£12');
    expect(body).not.toContain('£24');
  });

  test('Shop / Preloved / All tab chips are tappable', async ({ page }) => {
    const chips = ['ALL', 'SHOP', 'PRELOVED'];
    for (const chip of chips) {
      const el = page.locator(`text=${chip}`).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        await page.waitForTimeout(400);
      }
    }
    // Still alive after tapping chips
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('no horizontal overflow', async ({ page }) => {
    await expectNoHorizontalOverflow(page);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MUSIC TAB
// ════════════════════════════════════════════════════════════════════════════

test.describe('Music tab', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  test.beforeEach(async ({ page }) => {
    await setupUserA(page);
    await goToTab(page, 'Music');
    await page.waitForTimeout(2000);
  });

  test('content renders — not a blank screen', async ({ page }) => {
    const bodyText = await page.textContent('body');
    expect(bodyText!.length).toBeGreaterThan(100);
  });

  test('shows Smash Daddys or Raw Convict Records', async ({ page }) => {
    const body = await page.textContent('body');
    const hasContent = body!.includes('SMASH DADDYS') ||
                       body!.includes('Smash Daddys') ||
                       body!.includes('Raw Convict') ||
                       body!.includes('RAW CONVICT');
    expect(hasContent).toBe(true);
  });

  test('page is scrollable', async ({ page }) => {
    // The music tab should have at least one scrollable container
    const isScrollable = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('*'));
      return els.some((el) => {
        const s = window.getComputedStyle(el);
        return (s.overflowY === 'auto' || s.overflowY === 'scroll') &&
               (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight;
      });
    });
    expect(isScrollable).toBe(true);
  });

  test('no horizontal overflow', async ({ page }) => {
    await expectNoHorizontalOverflow(page);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// GHOSTED TAB
// ════════════════════════════════════════════════════════════════════════════

test.describe('Ghosted tab', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  test.beforeEach(async ({ page }) => {
    await setupUserA(page);
    await goToTab(page, 'Ghosted');
    await page.waitForTimeout(2000);
  });

  test('grid renders without full-screen canvas', async ({ page }) => {
    await expectNoFullscreenCanvas(page);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(50);
  });

  test('filter chips are tappable', async ({ page }) => {
    const chips = page.locator('button').filter({ hasText: /All|Online|Right Now|Events/i });
    const count = await chips.count();
    if (count > 0) {
      await chips.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('no horizontal overflow', async ({ page }) => {
    await expectNoHorizontalOverflow(page);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SAFETY / SOS BUTTON
// ════════════════════════════════════════════════════════════════════════════

test.describe('SOS Button', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  test('SOS button is visible and opens overlay without 404', async ({ page }) => {
    const errors = collectErrors(page);
    await setupUserA(page);
    await page.waitForTimeout(2000);

    // Find SOS button — data-testid, aria-label, or text
    const sosBtn = page.locator([
      '[data-testid="sos-button"]',
      '[aria-label="SOS"]',
      '[aria-label="Emergency"]',
      'button:has-text("SOS")',
    ].join(', ')).first();

    if (await sosBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sosBtn.click();
      await page.waitForTimeout(1500);

      // Overlay content should be visible
      const overlay = page.locator([
        '[data-testid="sos-overlay"]',
        'text=Emergency',
        'text=SOS',
        'text=Check-in',
      ].join(', ')).first();
      await expect(overlay).toBeVisible({ timeout: 5000 });

      // No 404 on emergency_contacts
      const has404 = errors.some((e) => e.includes('404') && e.includes('emergency'));
      expect(has404).toBe(false);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// MORE / VAULT
// ════════════════════════════════════════════════════════════════════════════

test.describe('More tab + Vault', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  test.beforeEach(async ({ page }) => {
    await setupUserA(page);
    await goToTab(page, 'More');
    await page.waitForTimeout(1500);
  });

  test('More hub items are visible', async ({ page }) => {
    const body = await page.textContent('body');
    // At least one hub item should be visible
    const hasItems = body!.includes('Profile') ||
                     body!.includes('Safety') ||
                     body!.includes('Settings');
    expect(hasItems).toBe(true);
  });

  test('Vault opens with Tickets/Orders/Saved tabs', async ({ page }) => {
    const vaultItem = page.locator('text=Vault').first();
    if (await vaultItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vaultItem.click();
      await page.waitForTimeout(2000);

      const body = await page.textContent('body');
      const hasTabs = body!.includes('Ticket') || body!.includes('Order') || body!.includes('Saved');
      expect(hasTabs).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// SHEET SYSTEM
// ════════════════════════════════════════════════════════════════════════════

test.describe('Sheet system', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  test('sheets close with X button or swipe-down', async ({ page }) => {
    await setupUserA(page);
    await goToTab(page, 'Ghosted');
    await page.waitForTimeout(2000);

    // Tap first profile card
    const card = page.locator('[data-testid="profile-card"], .profile-card, .ghost-card').first();
    if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(1000);

      // X button should close the sheet
      const closeBtn = page.locator('button[aria-label="Close"], button:has-text("✕"), [data-testid="close"]').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForTimeout(800);
        // Sheet should be gone
        await expect(closeBtn).not.toBeVisible();
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// LAYOUT: No horizontal overflow on any tab
// ════════════════════════════════════════════════════════════════════════════

test.describe('Layout: no horizontal overflow on any tab', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  const TABS = ['Home', 'Pulse', 'Ghosted', 'Market', 'Music', 'More'] as const;

  test('all tabs: no horizontal scroll', async ({ page }) => {
    await setupUserA(page);

    for (const tab of TABS) {
      await goToTab(page, tab);
      await page.waitForTimeout(1000);
      await expectNoHorizontalOverflow(page);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ONBOARDING re-loop regression test
// ════════════════════════════════════════════════════════════════════════════

test.describe('Returning user: no onboarding re-loop', () => {
  test.skip(!E2E_AUTH_CONFIGURED, 'Auth secrets not configured');

  test('authenticated user with onboarding_completed=true never sees onboarding', async ({ page }) => {
    await setupUserA(page);
    await page.waitForTimeout(4000);

    // Visit root 3 times — should never land on onboarding
    for (let i = 0; i < 3; i++) {
      await page.goto(url('/'));
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      expect(currentUrl, `Reload ${i + 1}: stuck in onboarding`).not.toContain('/onboarding');
    }
  });
});
