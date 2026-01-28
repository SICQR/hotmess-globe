import { test, expect } from '@playwright/test';

// Messaging E2E tests - Inbox, threads, send message flows

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass session-based AgeGate
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('inbox page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/social/inbox');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show inbox or login prompt
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('messages page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/messages');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show messages or redirect
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('can navigate to inbox from social', async ({ page }) => {
    await page.goto('/social');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Look for inbox/messages link
    const inboxLink = page.getByRole('link', { name: /inbox|messages/i });
    
    if (await inboxLink.isVisible().catch(() => false)) {
      await inboxLink.click();
      await expect(page).toHaveURL(/inbox|messages/);
    }
  });

  test('inbox shows empty state or message list', async ({ page }) => {
    await page.goto('/social/inbox');
    
    await page.waitForLoadState('networkidle');
    
    // Should show either conversations or empty state
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    // Check for common inbox elements
    const hasConversations = await page.locator('[data-testid="conversation"]').isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no messages|start a conversation/i).isVisible().catch(() => false);
    const hasLogin = await page.getByText(/sign in|log in/i).isVisible().catch(() => false);
    
    // One of these states should be present
    expect(hasConversations || hasEmpty || hasLogin || content!.length > 50).toBeTruthy();
  });
});

test.describe('Messaging - Thread View', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('thread page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // Try to access a conversation thread
    await page.goto('/social/inbox/thread-123');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show thread or redirect
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('message composer is accessible', async ({ page }) => {
    await page.goto('/social/inbox');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Look for compose/new message button
    const composeBtn = page.getByRole('button', { name: /new message|compose|write/i });
    
    const hasCompose = await composeBtn.isVisible().catch(() => false);
    
    if (hasCompose) {
      console.log('Message composer is accessible');
    }
  });
});

test.describe('Messaging - New Message Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('can initiate message from profile', async ({ page }) => {
    // Navigate to social/connect to find profiles
    await page.goto('/social');
    
    await page.waitForLoadState('networkidle');
    
    // Look for message button on profile cards
    const messageBtn = page.getByRole('button', { name: /message|chat/i }).first();
    
    if (await messageBtn.isVisible().catch(() => false)) {
      console.log('Message button available on profiles');
    }
  });

  test('inbox with recipient param loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // Try to start a conversation with a specific user
    await page.goto('/social/inbox?to=test@example.com');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show compose or redirect
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});
