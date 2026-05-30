/**
 * debug-auth.spec.ts — minimal auth injection diagnostic
 */
import { test, expect } from '@playwright/test';
import { bypassGates, TEST_USER_A } from './helpers/auth';

const ANON_KEY = process.env.PROD_SUPABASE_ANON_KEY ?? '';
const BASE = 'https://hotmessldn.com';
const STORAGE_KEY = 'sb-rfoftonnlwudilafhfkl-auth-token';

test('debug: verify localStorage injection and boot state', async ({ page }) => {
  // Capture all console messages
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[pageerror] ${err.message}`));

  // Step 1: Get a real token
  const response = await page.request.post(
    `https://rfoftonnlwudilafhfkl.supabase.co/auth/v1/token?grant_type=password`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
      data: { email: TEST_USER_A.email, password: 'HotmessE2E2026!' },
      timeout: 15_000,
    }
  );
  const session = await response.json();
  console.log('Auth status:', response.status(), 'has_token:', !!session.access_token);
  
  if (!session.access_token) {
    throw new Error(`Auth failed: ${JSON.stringify(session)}`);
  }

  // Step 2: Add init scripts (same as bypassGates + loginAs)
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    localStorage.setItem('hm_community_attested_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
    console.log('[debug init] Set hm_age_confirmed_v1 and community flags');
  });

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
    console.log('[debug init] Set auth token, user.id:', value.user?.id);
  }, { key: STORAGE_KEY, value: sessionPayload });

  // Step 3: Navigate
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  
  // Step 4: Check localStorage immediately after load
  const lsKeys = await page.evaluate(() => Object.keys(localStorage));
  const lsSession = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { const p = JSON.parse(raw); return { has_user: !!p?.user?.id, has_expires: !!p?.expires_at, user_id: p?.user?.id?.substring(0, 8) }; } catch { return 'parse_error'; }
  }, STORAGE_KEY);
  const lsAge = await page.evaluate(() => localStorage.getItem('hm_age_confirmed_v1'));
  
  console.log('localStorage keys:', lsKeys);
  console.log('Session in localStorage:', JSON.stringify(lsSession));
  console.log('Age confirmed:', lsAge);

  // Step 5: Wait 5 seconds for React to mount
  await page.waitForTimeout(5000);
  
  // Step 6: Check what's on screen  
  const bodyText = await page.textContent('body');
  const navExists = await page.locator('nav').count();
  const url = page.url();
  
  console.log('URL:', url);
  console.log('Nav elements:', navExists);
  console.log('Body snippet:', bodyText?.substring(0, 200));
  
  // Step 7: Check all [BootGuard] console messages
  const bootLogs = logs.filter(l => l.includes('BootGuard') || l.includes('boot') || l.includes('onboarding'));
  console.log('Boot logs:', bootLogs.join('\n'));

  // Take screenshot
  await page.screenshot({ path: '/tmp/debug-auth-screenshot.png', fullPage: false });
  
  // Assertions
  expect(lsSession).not.toBeNull();
  expect(lsAge).toBe('true');
  expect(navExists).toBeGreaterThan(0);
});
