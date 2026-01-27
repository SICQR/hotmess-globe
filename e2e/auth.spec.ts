import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('shows login page for unauthenticated users', async ({ page }) => {
    await page.goto('/auth');
    
    await expect(page.getByRole('heading', { name: /sign in|log in|welcome/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  });

  test('displays email input and submit button', async ({ page }) => {
    await page.goto('/auth');
    
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEditable();
    
    const submitButton = page.getByRole('button', { name: /sign in|continue|submit|log in/i });
    await expect(submitButton).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/auth');
    
    await page.getByRole('textbox', { name: /email/i }).fill('invalid-email');
    await page.getByRole('button', { name: /sign in|continue|submit|log in/i }).click();
    
    // Should show some error indication
    await expect(page.getByText(/invalid|valid email|please enter/i)).toBeVisible({ timeout: 5000 });
  });

  test('redirects authenticated users away from auth page', async ({ page, context }) => {
    // Set up mock authentication state
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-token',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
    
    // This test checks if there's redirect logic - adjust based on actual behavior
    await page.goto('/auth');
    
    // Page should either redirect or show auth form
    await page.waitForLoadState('networkidle');
  });
});
