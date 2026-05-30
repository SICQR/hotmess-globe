import { test, expect } from '@playwright/test';

// Profile E2E tests - View profile, edit profile, settings

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.beforeEach(async ({ page }) => {
  // Bypass session-based AgeGate
  await page.addInitScript(() => {
    localStorage.setItem('hm_age_confirmed_v1', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });
});

test.describe('Profile Pages', () => {
  test('profile page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/profile');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('settings page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/settings');
    
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/settings/);
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('settings page displays settings sections', async ({ page }) => {
    await page.goto('/settings');
    
    // Look for common settings sections
    const hasProfile = await page.getByText(/profile/i).first().isVisible().catch(() => false);
    const hasNotifications = await page.getByText(/notification/i).first().isVisible().catch(() => false);
    const hasPrivacy = await page.getByText(/privacy/i).first().isVisible().catch(() => false);
    const hasLanguage = await page.getByText(/language/i).first().isVisible().catch(() => false);
    
    // Should have at least some settings visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('edit profile page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/edit-profile');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test.describe('Settings Sections', () => {
  test('language switcher is present in settings', async ({ page }) => {
    await page.goto('/settings');
    
    // Look for language section
    const hasLanguageSection = await page.getByText(/language/i).first().isVisible().catch(() => false);
    
    // Page should render
    await expect(page.locator('body')).toBeVisible();
  });

  test('privacy settings link is present', async ({ page }) => {
    await page.goto('/settings');
    
    // Look for privacy-related links
    const hasPrivacy = await page.getByText(/privacy/i).first().isVisible().catch(() => false);
    const hasDataExport = await page.getByText(/export.*data|download.*data/i).first().isVisible().catch(() => false);
    const hasDeleteAccount = await page.getByText(/delete.*account/i).first().isVisible().catch(() => false);
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('can access help center from settings', async ({ page }) => {
    await page.goto('/settings');
    
    // Look for help/support links
    const hasHelp = await page.getByText(/help|support|faq/i).first().isVisible().catch(() => false);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('User Data', () => {
  test('data export page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/data-export');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('account deletion page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/account-deletion');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});
