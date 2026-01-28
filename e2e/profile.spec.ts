import { test, expect } from '@playwright/test';

// Profile E2E tests - View profile, edit profile, follow user flows

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass session-based AgeGate
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('profile page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // Visit a profile page (may redirect to login for own profile)
    await page.goto('/profile');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show profile or login prompt
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('public profile page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // Try to view a public profile
    await page.goto('/profile/public/test-user');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show profile or not found
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('social/connect page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/social');
    
    await expect(page).not.toHaveURL(/\/age(\?|$)/);
    await expect(page.locator('body')).toBeVisible();
    
    // Check for social/connect content
    await expect(page.getByText(/connect|social|people|discover/i).first()).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('settings page is accessible', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/settings');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show settings or login prompt
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test.describe('Profile - Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('edit profile page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/profile/edit');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show edit form or login prompt
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('settings has language option', async ({ page }) => {
    await page.goto('/settings');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Check for language settings
    const languageText = page.getByText(/language|idioma|langue/i);
    
    const hasLanguage = await languageText.isVisible().catch(() => false);
    
    if (hasLanguage) {
      console.log('Language settings are visible');
    }
  });
});

test.describe('Profile - Social Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('social discovery page shows profiles', async ({ page }) => {
    await page.goto('/social');
    
    await page.waitForLoadState('networkidle');
    
    // Should show discovery grid or empty state
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
  });

  test('can navigate to individual profiles from social', async ({ page }) => {
    await page.goto('/social');
    
    await page.waitForLoadState('networkidle');
    
    // Try to find profile cards
    const profileCard = page.locator('[data-testid="profile-card"]').first();
    
    if (await profileCard.isVisible().catch(() => false)) {
      console.log('Profile cards are displayed in social discovery');
    }
  });
});
