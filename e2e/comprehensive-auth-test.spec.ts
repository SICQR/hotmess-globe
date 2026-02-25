import { test, expect } from '@playwright/test';

test.describe('Comprehensive Auth Flow Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set age verification in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('hm_age_confirmed_v1', 'true');
    });
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('BROWSER ERROR:', msg.text());
      }
    });
  });

  test('A: Auth page loads without crash', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/auth');
    await expect(page.locator('body')).toBeVisible();
    // Should not redirect to /age
    await expect(page).not.toHaveURL(/\/age/);
  });

  test.skip('B: Email login works (skipped in DEV — BootRouter bypasses auth gates)', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/auth');
    
    // Fill credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'phil.gizzie@icloud.com');
    await page.fill('input[type="password"]', 'Hotmess123!');
    
    // Submit
    await page.click('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]');
    
    // Wait for redirect away from auth
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 15000 });
    
    // Should NOT be on age gate
    const url = page.url();
    console.log('After login URL:', url);
    expect(url).not.toContain('/age');
  });

  test.skip('C: Home page loads for authenticated user (skipped in DEV)', async ({ page }) => {
    // Login first
    await page.goto('http://127.0.0.1:5173/auth');
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'phil.gizzie@icloud.com');
    await page.fill('input[type="password"]', 'Hotmess123!');
    await page.click('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]');
    
    // Wait for navigation away from /auth
    await page.waitForTimeout(5000);
    
    // Check localStorage is set
    const ageVerified = await page.evaluate(() => localStorage.getItem('hm_age_confirmed_v1'));
    console.log('localStorage hm_age_confirmed_v1:', ageVerified);
    
    // Check current URL after login
    const urlAfterLogin = page.url();
    console.log('URL after login:', urlAfterLogin);
    
    // If we're at home, we're good - if at /age after login, that's the bug
    // Don't navigate away - just check where login took us
    expect(urlAfterLogin).not.toContain('/age');
    expect(urlAfterLogin).not.toContain('/auth');
  });
});
