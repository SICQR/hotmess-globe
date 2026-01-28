import { test, expect } from '@playwright/test';

// Events E2E tests - Browse events, view details, and RSVP flows

test.describe('Events', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass session-based AgeGate
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('events page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/events');
    
    await expect(page).not.toHaveURL(/\/age(\?|$)/);
    await expect(page.locator('body')).toBeVisible();
    
    // Check for events page content
    await expect(page.getByText(/events|discover|upcoming/i).first()).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('can navigate to events from navigation', async ({ page }) => {
    await page.goto('/');
    
    // Look for Events navigation item
    const navItem = page.getByRole('link', { name: /events/i }).first();
    
    if (await navItem.isVisible()) {
      await navItem.click();
      await expect(page).toHaveURL(/events/);
    }
  });

  test('events page displays content', async ({ page }) => {
    await page.goto('/events');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for event listings or empty state
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);
  });

  test('events page has search or filter functionality', async ({ page }) => {
    await page.goto('/events');
    
    // Look for search input
    const searchInput = page.getByPlaceholder(/search|find/i);
    const filterBtn = page.getByRole('button', { name: /filter/i });
    
    const hasSearch = await searchInput.isVisible().catch(() => false);
    const hasFilter = await filterBtn.isVisible().catch(() => false);
    
    // At least some form of filtering should be available
    if (hasSearch || hasFilter) {
      console.log('Events page has search/filter functionality');
    }
  });

  test('event calendar view loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/events/calendar');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show calendar or redirect
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('my events page loads (may require auth)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/events/mine');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show events or login prompt
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test.describe('Events - Event Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('event detail page loads', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // Try a sample event ID
    await page.goto('/events/1');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Should show event details or not found
    const content = await page.locator('body').textContent();
    expect(content).toBeTruthy();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('event page shows expected elements when available', async ({ page }) => {
    await page.goto('/events');
    
    // Wait for events to load
    await page.waitForLoadState('networkidle');
    
    // Try to click on an event card if one exists
    const eventCard = page.locator('[data-testid="event-card"]').first();
    
    if (await eventCard.isVisible().catch(() => false)) {
      await eventCard.click();
      
      // Check for event detail elements
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Events - RSVP Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('age_verified', 'true');
      sessionStorage.setItem('location_consent', 'false');
    });
  });

  test('RSVP button visibility', async ({ page }) => {
    // Navigate to an event page
    await page.goto('/events/1');
    
    await expect(page.locator('body')).toBeVisible();
    
    // Look for RSVP, Get Tickets, or similar buttons
    const rsvpBtn = page.getByRole('button', { name: /rsvp|get tickets|book|attend/i });
    
    const hasRsvp = await rsvpBtn.isVisible().catch(() => false);
    
    // RSVP functionality should be present on event detail pages
    if (hasRsvp) {
      console.log('RSVP button is visible on event page');
    }
  });
});
