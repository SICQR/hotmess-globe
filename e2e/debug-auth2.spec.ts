/**
 * debug-auth2.spec.ts — test in-browser profile fetch result
 */
import { test, expect } from '@playwright/test';

const ANON_KEY = process.env.PROD_SUPABASE_ANON_KEY ?? '';
const BASE = 'https://hotmessldn.com';
const STORAGE_KEY = 'sb-rfoftonnlwudilafhfkl-auth-token';

test('debug2: in-browser profile fetch and onboarding_completed check', async ({ browser }) => {
  // Create a FRESH context (no prior visits)
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();

  try {
    // Get token
    const authRes = await page.request.post(
      `https://rfoftonnlwudilafhfkl.supabase.co/auth/v1/token?grant_type=password`,
      {
        headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
        data: { email: process.env.TEST_USER_A_EMAIL ?? 'e2e.alpha@hotmessldn.com', password: process.env.TEST_USER_A_PASSWORD ?? '' },
        timeout: 15_000,
      }
    );
    const session = await authRes.json();
    
    if (!session.access_token) throw new Error('No token: ' + JSON.stringify(session));
    console.log('Got token, user.id:', session.user?.id);

    // Inject localStorage + navigate
    await page.addInitScript(() => {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
      localStorage.setItem('hm_community_attested_v1', 'true');
    });
    await page.addInitScript(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    }, { key: STORAGE_KEY, value: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user: session.user,
    }});

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Wait 1 second for React to mount
    await page.waitForTimeout(1000);

    // Make a direct browser-side fetch to Supabase profiles API
    const profileResult = await page.evaluate(async ({ anonKey, userId }) => {
      // Get the stored access_token from localStorage
      const raw = localStorage.getItem('sb-rfoftonnlwudilafhfkl-auth-token');
      const stored = raw ? JSON.parse(raw) : null;
      const token = stored?.access_token;

      const res = await fetch(
        `https://rfoftonnlwudilafhfkl.supabase.co/rest/v1/profiles?id=eq.${userId}&select=id,onboarding_completed,onboarding_stage,age_verified`,
        {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${token}`,
          }
        }
      );
      const data = await res.json();
      return { status: res.status, data, token_len: token?.length ?? 0 };
    }, { anonKey: ANON_KEY, userId: 'e2e00001-0000-0000-0000-000000000001' });

    console.log('In-browser profile fetch result:', JSON.stringify(profileResult));
    
    // Check what's on screen
    const bodyText = await page.textContent('body') ?? '';
    const navCount = await page.locator('nav').count();
    console.log('Nav count:', navCount);
    console.log('Screen:', bodyText.substring(0, 100));

    // The profile must show onboarding_completed: true
    expect(profileResult.data).toHaveLength(1);
    expect(profileResult.data[0].onboarding_completed).toBe(true);
  } finally {
    await ctx.close();
  }
});
