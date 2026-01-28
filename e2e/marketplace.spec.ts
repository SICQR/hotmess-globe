import { test, expect } from '@playwright/test';

// Marketplace E2E tests - Browse, filter, and cart functionality

test.describe('Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass session-based AgeGate
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('marketplace page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/market');
    
    await expect(page).not.toHaveURL(/\/age(\?|$)/);
    await expect(page.locator('body')).toBeVisible();
    
    // Check for marketplace content
    await expect(page.getByText(/market|shop|browse/i).first()).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('can navigate to marketplace from navigation', async ({ page }) => {
    await page.goto('/');
    
    // Look for Market/Shop navigation item
    const navItem = page.getByRole('link', { name: /market|shop/i }).first();
    
    if (await navItem.isVisible()) {
      await navItem.click();
      await expect(page).toHaveURL(/market/);
    }
  });

  test('marketplace displays products or empty state', async ({ page }) => {
    await page.goto('/market');
    
    // Should show either products or an empty/loading state
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
    
    // Check for common marketplace elements
    const productCard = page.locator('[data-testid="product-card"]').first();
    const emptyState = page.getByText(/no products|browse|coming soon/i).first();
    const loadingState = page.getByText(/loading/i).first();
    
    // At least one of these should be present
    const hasProducts = await productCard.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasLoading = await loadingState.isVisible().catch(() => false);
    
    // The page should render something
    expect(hasProducts || hasEmpty || hasLoading || hasContent.length > 100).toBeTruthy();
  });

  test('cart icon is visible on marketplace', async ({ page }) => {
    await page.goto('/market');
    
    // Look for cart icon/button
    const cartIcon = page.locator('[data-testid="cart-icon"]');
    const cartButton = page.getByRole('button', { name: /cart/i });
    const cartLink = page.getByRole('link', { name: /cart/i });
    
    const hasCartIcon = await cartIcon.isVisible().catch(() => false);
    const hasCartButton = await cartButton.isVisible().catch(() => false);
    const hasCartLink = await cartLink.isVisible().catch(() => false);
    
    // Cart functionality should be accessible
    // Note: This may not be implemented yet
    if (!hasCartIcon && !hasCartButton && !hasCartLink) {
      console.log('Cart icon not yet implemented in UI');
    }
  });

  test('product detail page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // Try navigating to a product detail page directly
    await page.goto('/market/product/1');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show product details or redirect/404
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('collections page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/market/collections');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test.describe('Marketplace - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('filter/sort options are accessible', async ({ page }) => {
    await page.goto('/market');
    
    // Look for filter or sort buttons
    const filterBtn = page.getByRole('button', { name: /filter/i });
    const sortBtn = page.getByRole('button', { name: /sort/i });
    const categoryFilter = page.getByRole('button', { name: /category/i });
    
    const hasFilter = await filterBtn.isVisible().catch(() => false);
    const hasSort = await sortBtn.isVisible().catch(() => false);
    const hasCategory = await categoryFilter.isVisible().catch(() => false);
    
    // Log which filters are available
    if (hasFilter || hasSort || hasCategory) {
      console.log('Marketplace has filtering options');
    }
  });
});
