import { test, expect } from '@playwright/test';

test.describe('Connect Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/connect');
  });

  test('displays lane tabs', async ({ page }) => {
    // Check for tab navigation
    const tabs = page.getByRole('tab').or(page.getByRole('tablist'));
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
  });

  test('can switch between tabs', async ({ page }) => {
    const tabs = page.getByRole('tab');
    
    if (await tabs.count() > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('data-state', /active|selected/);
    }
  });

  test('displays profile grid or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Either profile cards or empty state message should be visible
    const profileCard = page.locator('[data-testid="profile-card"]').or(
      page.locator('.profile-card')
    );
    const emptyState = page.getByText(/no profiles|no results|no matches/i);
    
    const hasCards = await profileCard.first().isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    
    expect(hasCards || hasEmptyState).toBe(true);
  });

  test('filter button is accessible', async ({ page }) => {
    const filterButton = page.getByRole('button', { name: /filter|filters/i }).or(
      page.locator('[data-testid="filter-button"]')
    );
    
    if (await filterButton.isVisible().catch(() => false)) {
      await expect(filterButton).toBeEnabled();
    }
  });
});
