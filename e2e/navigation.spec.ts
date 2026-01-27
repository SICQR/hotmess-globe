import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    await expect(page).toHaveTitle(/hotmess|globe/i);
    await page.waitForLoadState('networkidle');
  });

  test('bottom navigation is visible', async ({ page }) => {
    await page.goto('/');
    
    // Check for main navigation elements
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible();
  });

  test('can navigate to key pages', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to Connect page
    const connectLink = page.getByRole('link', { name: /connect/i }).first();
    if (await connectLink.isVisible()) {
      await connectLink.click();
      await expect(page).toHaveURL(/connect/);
    }
  });

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    
    await expect(
      page.getByText(/not found|404|doesn't exist/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
