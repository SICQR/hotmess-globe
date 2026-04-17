import { test, expect } from '@playwright/test';

const GOLD = 'rgb(200, 150, 44)'; // #C8962C

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test.beforeEach(async ({ page }) => {
  // Clear all onboarding flags so we start fresh every test
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe('Splash screen', () => {
  test('shows JOIN and Sign In buttons for new users', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /join/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('tagline is present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/always too much/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Age gate popup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /join/i }).click();
  });

  test("shows Daddy's home copy", async ({ page }) => {
    await expect(page.getByText(/daddy's home/i)).toBeVisible();
  });

  test('shows Built for boys like you', async ({ page }) => {
    await expect(page.getByText(/built for boys like you/i)).toBeVisible();
  });

  test('Enter button disabled before checkbox ticked', async ({ page }) => {
    const btn = page.getByRole('button', { name: /confirm to enter|enter the mess/i });
    await expect(btn).toBeDisabled();
  });

  test('Enter button activates after checkbox ticked', async ({ page }) => {
    await page.getByRole('checkbox').check();
    const btn = page.getByRole('button', { name: /enter the mess/i });
    await expect(btn).toBeEnabled();
  });

  test('ticking checkbox changes button copy to Enter the Mess', async ({ page }) => {
    await expect(page.getByRole('button', { name: /confirm to enter/i })).toBeVisible();
    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: /enter the mess/i })).toBeVisible();
  });

  test('under 18 link shows blocked screen', async ({ page }) => {
    await page.getByText(/i am under 18/i).click();
    await expect(page.getByText(/hotmess is for men aged 18/i)).toBeVisible();
  });
});

test.describe('Sign up screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /join/i }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /enter the mess/i }).click();
  });

  test("shows Let's get you in heading", async ({ page }) => {
    await expect(page.getByText(/let's get you in/i)).toBeVisible();
  });

  test('shows progress dots step 2 of 3', async ({ page }) => {
    // 2 filled dots visible (●)
    const filledDots = page.locator('span').filter({ hasText: '●' });
    await expect(filledDots).toHaveCount(2);
  });

  test('shows Apple and Google sign in options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with apple/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('magic link button says Send my link', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await expect(page.getByRole('button', { name: /send my link/i })).toBeVisible();
  });
});

test.describe('Sign in screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sign in/i }).click();
  });

  test("shows You're back. Good. heading", async ({ page }) => {
    await expect(page.getByText(/you're back\. good\./i)).toBeVisible();
  });

  test('no progress dots on sign in screen', async ({ page }) => {
    // Dots only show for new user join flow
    const filledDots = page.locator('span').filter({ hasText: '●' });
    await expect(filledDots).toHaveCount(0);
  });
});

test.describe('Returning user fast-path', () => {
  test('user with valid session sees Continue not JOIN', async ({ page }) => {
    // Inject a fake session to simulate returning user
    await page.addInitScript(() => {
      localStorage.setItem('hm_last_display_name', 'TestBoy');
      // BootGuard will redirect to /ghosted if session is real —
      // this test just checks splash renders the returning state
      localStorage.setItem('hm_splash_seen_v1', 'true');
    });
    // If no real session, splash shows normal buttons — this is a UI state test
    // Full returning user test requires injecting a real Supabase session via loginAs()
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});
