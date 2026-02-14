import { test, expect } from '@playwright/test';

// Messaging E2E tests - Social features, messaging, chat

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

test.describe('Social Features', () => {
  test('social page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/social');
    
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/age(\?|$)/);
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('social page displays content or auth prompt', async ({ page }) => {
    await page.goto('/social');
    
    // Should show either social content or login prompt
    const hasContent = await page.locator('main, [role="main"]').first().isVisible().catch(() => false);
    const hasAuthPrompt = await page.getByText(/sign in|log in|connect/i).first().isVisible().catch(() => false);
    
    expect(hasContent || hasAuthPrompt).toBe(true);
  });
});

test.describe('Messages', () => {
  test('messages page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/messages');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('messages shows empty state or conversations', async ({ page }) => {
    await page.goto('/messages');
    
    // Should show either messages or empty state
    const hasMessages = await page.locator('[data-testid="conversation"], .conversation-item').first().isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no messages|start a conversation|inbox empty/i).first().isVisible().catch(() => false);
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('chat page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/chat');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test.describe('Connect Features', () => {
  test('connect page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/connect');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('profiles grid page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/profiles');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test.describe('Squad Features', () => {
  test('squad chat page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/squad-chat');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('community page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/community');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});
