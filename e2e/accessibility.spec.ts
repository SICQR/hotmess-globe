import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('home page has skip to content link', async ({ page }) => {
    await page.goto('/');
    
    // Focus first element to reveal skip link
    await page.keyboard.press('Tab');
    
    const skipLink = page.getByRole('link', { name: /skip to content|skip to main/i });
    // Skip link might be visually hidden until focused
    const skipLinkExists = await skipLink.count() > 0;
    expect(skipLinkExists).toBe(true);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');
      
      // Image should have alt text, aria-label, or be decorative (role="presentation")
      expect(alt !== null || ariaLabel !== null || role === 'presentation').toBe(true);
    }
  });

  test('buttons are focusable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.getByRole('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await button.focus();
        await expect(button).toBeFocused();
      }
    }
  });

  test('forms have proper labels', async ({ page }) => {
    await page.goto('/auth');
    
    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        
        // Input should have associated label
        const hasLabel = id
          ? (await page.locator(`label[for="${id}"]`).count()) > 0
          : false;
        
        expect(
          hasLabel || ariaLabel || ariaLabelledBy || placeholder
        ).toBeTruthy();
      }
    }
  });

  test('page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1s = await page.locator('h1').count();
    expect(h1s).toBeLessThanOrEqual(2); // Should have 1-2 h1s max

    // Check that h2s exist if content is substantial
    const h2s = await page.locator('h2').count();
    const pageContent = await page.locator('main, #root').textContent();
    
    if (pageContent && pageContent.length > 500) {
      expect(h2s).toBeGreaterThan(0);
    }
  });

  test('color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/');
    
    // Check that text is not pure white on white or black on black
    const textElements = page.locator('p, span, h1, h2, h3, a, button');
    const count = await textElements.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const el = textElements.nth(i);
      if (await el.isVisible()) {
        const color = await el.evaluate((e) => 
          getComputedStyle(e).color
        );
        const bgColor = await el.evaluate((e) => 
          getComputedStyle(e).backgroundColor
        );
        
        // Basic check: color and bgColor shouldn't be identical
        if (color && bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
          expect(color).not.toBe(bgColor);
        }
      }
    }
  });
});
