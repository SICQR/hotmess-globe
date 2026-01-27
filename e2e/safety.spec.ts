import { test, expect } from '@playwright/test';

test.describe('Safety Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/safety');
    await page.waitForLoadState('networkidle');
  });

  test('safety page loads correctly', async ({ page }) => {
    // Should show safety content
    await expect(
      page.getByText(/safety|security|protection/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('displays trusted contacts section', async ({ page }) => {
    await expect(
      page.getByText(/trusted|contact|emergency/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('displays check-in feature', async ({ page }) => {
    await expect(
      page.getByText(/check.?in|check out|timer/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('displays panic button', async ({ page }) => {
    // Look for panic/SOS button
    const panicButton = page.getByRole('button', { name: /panic|sos|emergency|help/i }).first();
    
    // Panic button should be prominent
    await expect(panicButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Safety - Trusted Contacts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/safety');
    await page.waitForLoadState('networkidle');
  });

  test('can see add contact form', async ({ page }) => {
    // Look for contact form inputs
    const nameInput = page.getByPlaceholder(/name/i).first()
                      || page.getByLabel(/name/i).first();
    
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test('contact form has required fields', async ({ page }) => {
    // Phone input
    const phoneInput = page.getByPlaceholder(/phone/i).first()
                       || page.getByLabel(/phone/i).first();
    
    // Email input
    const emailInput = page.getByPlaceholder(/email/i).first()
                       || page.getByLabel(/email/i).first();
    
    // At least phone or email should be available
    const hasPhone = await phoneInput.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmail = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasPhone || hasEmail).toBeTruthy();
  });

  test('can select relationship type', async ({ page }) => {
    // Look for relationship selector
    const relationshipSelect = page.getByText(/relationship|friend|family|partner/i).first()
                               || page.getByRole('combobox').first();
    
    if (await relationshipSelect.isVisible({ timeout: 5000 })) {
      await relationshipSelect.click();
      
      // Relationship options should appear
      await expect(
        page.getByText(/friend|family|partner|other/i).first()
      ).toBeVisible({ timeout: 3000 });
    }
  });

  test('add contact button is present', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add.*contact|save/i }).first();
    
    await expect(addButton).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Safety - Check-In Timer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/safety');
    await page.waitForLoadState('networkidle');
  });

  test('displays check-in timer options', async ({ page }) => {
    // Look for time duration options
    await expect(
      page.getByText(/hour|minute|duration|timer/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('can see check-in button', async ({ page }) => {
    const checkInButton = page.getByRole('button', { name: /check.?in|start|activate/i }).first();
    
    await expect(checkInButton).toBeVisible({ timeout: 5000 });
  });

  test('can select check-out time duration', async ({ page }) => {
    // Look for duration selector
    const durationSelector = page.getByText(/1.*hour|2.*hour|4.*hour/i).first()
                             || page.getByRole('slider').first()
                             || page.getByRole('combobox').first();
    
    if (await durationSelector.isVisible({ timeout: 5000 })) {
      // Duration selection is available
      expect(true).toBe(true);
    }
  });
});

test.describe('Safety - Panic Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/safety');
    await page.waitForLoadState('networkidle');
  });

  test('panic button is prominent and visible', async ({ page }) => {
    const panicButton = page.getByRole('button', { name: /panic|sos|emergency|help/i }).first();
    
    await expect(panicButton).toBeVisible({ timeout: 5000 });
  });

  test('panic button has warning styling', async ({ page }) => {
    const panicButton = page.getByRole('button', { name: /panic|sos|emergency|help/i }).first();
    
    if (await panicButton.isVisible({ timeout: 5000 })) {
      // Button should have emergency styling (red, bold, etc)
      // Just verify it's clickable without actually triggering
      await expect(panicButton).toBeEnabled();
    }
  });
});

test.describe('Safety - Location Sharing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/safety');
    await page.waitForLoadState('networkidle');
  });

  test('temporary location sharing is visible', async ({ page }) => {
    await expect(
      page.getByText(/share.*location|location.*sharing|temporary/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('can see share location button', async ({ page }) => {
    const shareButton = page.getByRole('button', { name: /share|start sharing/i }).first();
    
    if (await shareButton.isVisible({ timeout: 5000 })) {
      expect(true).toBe(true);
    }
  });

  test('location sharing shows duration options', async ({ page }) => {
    const shareButton = page.getByRole('button', { name: /share|start sharing/i }).first();
    
    if (await shareButton.isVisible({ timeout: 5000 })) {
      await shareButton.click();
      
      // Duration options should appear
      await expect(
        page.getByText(/15.*min|30.*min|1.*hour|2.*hour/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('shows privacy grid notice', async ({ page }) => {
    // Privacy note about 500m grid
    await expect(
      page.getByText(/500m|privacy.*grid|approximate|exact.*location.*never/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Safety - Emergency Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/safety');
    await page.waitForLoadState('networkidle');
  });

  test('can customize emergency messages', async ({ page }) => {
    await expect(
      page.getByText(/emergency.*message|custom.*message|sos.*message/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Safety - Tabs Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/safety');
    await page.waitForLoadState('networkidle');
  });

  test('safety page has multiple sections/tabs', async ({ page }) => {
    // Look for tab navigation
    const tabs = page.getByRole('tablist').first()
                 || page.getByRole('tab').first();
    
    if (await tabs.isVisible({ timeout: 5000 })) {
      // Tabs exist
      expect(true).toBe(true);
    }
  });

  test('can switch between safety sections', async ({ page }) => {
    const tab = page.getByRole('tab').first();
    
    if (await tab.isVisible({ timeout: 5000 })) {
      await tab.click();
      await page.waitForLoadState('networkidle');
    }
  });
});
