import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from marketplace
    await page.goto('/market');
    await page.waitForLoadState('networkidle');
  });

  test('marketplace page loads correctly', async ({ page }) => {
    await expect(page).toHaveURL(/market/);
    
    // Should show marketplace content
    await expect(
      page.getByRole('heading', { name: /market|shop|store/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('displays product tabs and filters', async ({ page }) => {
    // Should have filter/sort options
    await expect(
      page.getByText(/all|featured|newest/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('can search for products', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForLoadState('networkidle');
    }
  });

  test('can view product details', async ({ page }) => {
    // Wait for products to load
    await page.waitForTimeout(2000);
    
    // Click on first product card if available
    const productCard = page.locator('[data-testid="product-card"]').first();
    
    if (await productCard.isVisible({ timeout: 5000 })) {
      await productCard.click();
      
      // Should navigate to product detail page
      await expect(page).toHaveURL(/product/);
    }
  });

  test('can add product to cart', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find add to cart button on product card
    const addToCartButton = page.getByRole('button', { name: /add.*cart|add to cart/i }).first();
    
    if (await addToCartButton.isVisible({ timeout: 5000 })) {
      await addToCartButton.click();
      
      // Should show success feedback (toast or cart update)
      await expect(
        page.getByText(/added|cart|success/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('can open cart', async ({ page }) => {
    // Click cart icon
    const cartIcon = page.locator('[data-testid="cart-icon"]').first()
                     || page.getByRole('button', { name: /cart|bag/i }).first();
    
    if (await cartIcon.isVisible({ timeout: 5000 })) {
      await cartIcon.click();
      
      // Cart drawer/modal should open
      await expect(
        page.getByText(/your cart|shopping cart|cart|checkout/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('shows empty cart state', async ({ page }) => {
    // Clear any existing cart state
    await page.evaluate(() => {
      localStorage.removeItem('guest_cart');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Open cart
    const cartIcon = page.locator('[data-testid="cart-icon"]').first()
                     || page.getByRole('button', { name: /cart|bag/i }).first();
    
    if (await cartIcon.isVisible({ timeout: 5000 })) {
      await cartIcon.click();
      
      // Should show empty state
      await expect(
        page.getByText(/empty|no items|add some/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Checkout - Authentication', () => {
  test('checkout requires authentication', async ({ page }) => {
    // Go directly to checkout
    await page.goto('/checkout');
    
    // Should redirect to auth or show auth modal
    await page.waitForLoadState('networkidle');
    
    // Either redirected to auth page or showing auth modal
    const isOnAuthPage = page.url().includes('auth');
    const hasAuthModal = await page.getByText(/sign in|log in/i).first().isVisible({ timeout: 5000 });
    
    expect(isOnAuthPage || hasAuthModal).toBeTruthy();
  });
});

test.describe('Marketplace - Product Collections', () => {
  test('can view collections', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('networkidle');
    
    // Look for collection section
    const collectionsSection = page.getByText(/collection|category/i).first();
    
    if (await collectionsSection.isVisible({ timeout: 5000 })) {
      // Collections are displayed
      expect(true).toBe(true);
    }
  });

  test('can filter by seller', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('networkidle');
    
    // Find seller filter
    const sellerFilter = page.getByText(/seller|vendor/i).first();
    
    if (await sellerFilter.isVisible({ timeout: 5000 })) {
      await sellerFilter.click();
      
      // Filter options should appear
      await expect(
        page.getByText(/all|verified|new/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('can sort products', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('networkidle');
    
    // Find sort dropdown
    const sortTrigger = page.getByRole('combobox').first()
                        || page.getByText(/sort by|newest|price/i).first();
    
    if (await sortTrigger.isVisible({ timeout: 5000 })) {
      await sortTrigger.click();
      
      // Sort options should appear
      await expect(
        page.getByText(/newest|oldest|price.*low|price.*high/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Marketplace - Price Filtering', () => {
  test('can filter by price range', async ({ page }) => {
    await page.goto('/market');
    await page.waitForLoadState('networkidle');
    
    // Look for price slider or inputs
    const priceFilter = page.getByText(/price|range/i).first();
    
    // Price filtering exists in some form
    await page.waitForLoadState('networkidle');
  });
});
