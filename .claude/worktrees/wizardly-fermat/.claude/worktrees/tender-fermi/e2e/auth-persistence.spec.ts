/**
 * Auth Persistence E2E Tests
 * 
 * These tests verify that auth sessions survive page refreshes,
 * navigation, and don't get incorrectly cleared.
 */
import { test, expect } from '@playwright/test';

test.describe('Auth Session Persistence', () => {
  test('clearBadSessions does not clear valid sessions', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check console for session clearing messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that no valid sessions were cleared
    const badClears = consoleLogs.filter(log => 
      log.includes('[clearBadSessions] Removed:') && 
      log.includes('klsywpvncqqglhnhrjbh')
    );
    
    expect(badClears.length).toBe(0);
  });

  test('localStorage auth token format is correct', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check localStorage for Supabase auth keys
    const authKeys = await page.evaluate(() => {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('auth-token')) {
          keys.push(key);
        }
      }
      return keys;
    });

    // If there are auth keys, they should be for the correct project
    for (const key of authKeys) {
      // Should NOT contain old/wrong project refs
      expect(key).not.toContain('axxwdjmbwkvqhcpwters');
      expect(key).not.toContain('klbmalzhmxnelyuabawk');
    }
  });

  test('page refresh does not show logout flash', async ({ page }) => {
    // Set age verified in localStorage to bypass gates
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
      localStorage.setItem('hm_community_attested_v1', 'true');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait a moment for any auth redirects
    await page.waitForTimeout(2000);
    
    // Should not have been redirected to auth page
    const url = page.url();
    expect(url).not.toContain('/auth');
  });

  test('pull-to-refresh CSS prevents native reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that overscroll-behavior is set
    const overscrollBehavior = await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      const htmlStyle = getComputedStyle(html).overscrollBehaviorY;
      const bodyStyle = getComputedStyle(body).overscrollBehaviorY;
      return { html: htmlStyle, body: bodyStyle };
    });

    // At least one should be 'none' to prevent native pull-to-refresh
    const hasProtection = 
      overscrollBehavior.html === 'none' || 
      overscrollBehavior.body === 'none';
    
    expect(hasProtection).toBe(true);
  });

  test('env config uses consistent Supabase project', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that Supabase URL in the app matches expected project
    const supabaseUrl = await page.evaluate(() => {
      // @ts-ignore - accessing Vite env
      return (window as any).__SUPABASE_URL__ || 
             document.querySelector('meta[name="supabase-url"]')?.getAttribute('content') ||
             'unknown';
    });

    // This test documents which project should be active
    // If this fails, there's an env mismatch
    if (supabaseUrl !== 'unknown') {
      expect(supabaseUrl).toContain('klsywpvncqqglhnhrjbh');
    }
  });
});

test.describe('Boot Flow Stability', () => {
  test('app does not restart on grid scroll', async ({ page }) => {
    // Set localStorage to bypass gates first
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
      localStorage.setItem('hm_community_attested_v1', 'true');
    });
    
    await page.goto('/ghosted');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Record initial URL (might redirect if auth required)
    const initialUrl = page.url();
    
    // Simulate scrolling
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });
    await page.waitForTimeout(500);
    
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    
    // URL should not have changed after scrolling
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/auth');
    expect(currentUrl).toBe(initialUrl); // Should stay on same page
  });

  test('multiple rapid navigations do not cause logout', async ({ page }) => {
    // Set localStorage to bypass gates
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
      localStorage.setItem('hm_community_attested_v1', 'true');
    });
    
    // Rapid navigation with shorter waits
    await page.goto('/pulse');
    await page.waitForTimeout(500);
    await page.goto('/market');
    await page.waitForTimeout(500);
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Should not be on auth page
    expect(page.url()).not.toContain('/auth');
  });
});
