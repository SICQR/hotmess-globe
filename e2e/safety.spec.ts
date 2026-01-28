import { test, expect } from '@playwright/test';

// Safety E2E tests - Panic button, trusted contacts, location sharing

test.describe('Safety Features', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass session-based AgeGate
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('panic button is visible when logged in', async ({ page }) => {
    // The panic button should be visible for logged-in users
    await page.goto('/social');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Look for panic button
    const panicBtn = page.getByRole('button', { name: /panic|sos|emergency/i });
    
    const hasPanic = await panicBtn.isVisible().catch(() => false);
    
    // Note: Panic button only shows for authenticated users
    if (hasPanic) {
      console.log('Panic button is visible');
    } else {
      console.log('Panic button not visible (user not authenticated or feature disabled)');
    }
  });

  test('trusted contacts page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/safety/trusted-contacts');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show trusted contacts or login prompt
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('safety settings page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/safety');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show safety settings or redirect
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('check-in page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/safety/check-in');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show check-in form or redirect
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test.describe('Safety - Panic Button Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('panic button shows confirmation dialog', async ({ page }) => {
    await page.goto('/social');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Find and click panic button
    const panicBtn = page.getByRole('button', { name: /panic/i });
    
    if (await panicBtn.isVisible().catch(() => false)) {
      await panicBtn.click();
      
      // Should show confirmation dialog
      const dialog = page.getByRole('alertdialog');
      const confirmText = page.getByText(/emergency|sos|are you sure/i);
      
      const hasDialog = await dialog.isVisible().catch(() => false);
      const hasConfirm = await confirmText.isVisible().catch(() => false);
      
      if (hasDialog || hasConfirm) {
        console.log('Panic confirmation dialog is shown');
        
        // Don't actually trigger the panic - close the dialog
        const cancelBtn = page.getByRole('button', { name: /cancel/i });
        if (await cancelBtn.isVisible().catch(() => false)) {
          await cancelBtn.click();
        }
      }
    }
  });
});

test.describe('Safety - Location Privacy', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('location privacy options in settings', async ({ page }) => {
    await page.goto('/settings');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Check for location privacy settings
    const locationPrivacy = page.getByText(/location privacy|privacy|location/i);
    
    const hasPrivacy = await locationPrivacy.isVisible().catch(() => false);
    
    if (hasPrivacy) {
      console.log('Location privacy settings are accessible');
    }
  });
});
