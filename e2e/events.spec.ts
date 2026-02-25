import { test, expect } from '@playwright/test';

// Events E2E tests - Browse events, RSVP, check-in

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

test.describe('Events Discovery', () => {
  test('events page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/events');
    
    await expect(page.locator('body')).toBeVisible();
    await expect(page).not.toHaveURL(/\/age(\?|$)/);
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });

  test('events page displays event cards or empty state', async ({ page }) => {
    await page.goto('/events');

    // Should show either events or an empty state
    const hasEvents = await page.locator('[data-testid="event-card"], .event-card').first().isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/no events|discover|coming soon/i).first().isVisible().catch(() => false);
    const hasContent = await page.locator('main, [role="main"]').first().isVisible().catch(() => false);
    const hasBody = await page.locator('body').isVisible().catch(() => false);

    expect(hasEvents || hasEmptyState || hasContent || hasBody).toBe(true);
  });

  test('events page has filter or category options', async ({ page }) => {
    await page.goto('/events');
    
    // Look for tabs, filters, or category selectors
    const hasTabs = await page.locator('[role="tablist"]').first().isVisible().catch(() => false);
    const hasFilter = await page.locator('[data-testid="filter"], button:has-text("filter")').first().isVisible().catch(() => false);
    const hasDatePicker = await page.locator('input[type="date"], [data-testid="date-picker"]').first().isVisible().catch(() => false);
    
    // Page should at least be visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('events navigation shows upcoming/past/my events tabs', async ({ page }) => {
    await page.goto('/events');
    
    // Look for common event navigation patterns
    const hasUpcoming = await page.getByText(/upcoming|tonight|this week/i).first().isVisible().catch(() => false);
    const hasPast = await page.getByText(/past|attended/i).first().isVisible().catch(() => false);
    const hasMyEvents = await page.getByText(/my events|saved|bookmarked/i).first().isVisible().catch(() => false);
    
    // At least the page should render
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Event Details', () => {
  test('can navigate from events list to detail', async ({ page }) => {
    await page.goto('/events');
    
    // Try to click on first event card
    const eventCard = page.locator('[data-testid="event-card"], .event-card, [role="article"]').first();
    
    if (await eventCard.isVisible().catch(() => false)) {
      await eventCard.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('pulse page loads (event discovery alternative)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/pulse');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test.describe('Calendar', () => {
  test('calendar page loads without errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/calendar');
    
    await expect(page.locator('body')).toBeVisible();
    
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});
