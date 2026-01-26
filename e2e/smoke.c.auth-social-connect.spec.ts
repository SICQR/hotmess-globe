import { test, expect } from '@playwright/test';

// C = authenticated happy path (optional).
// Skips unless E2E_EMAIL + E2E_PASSWORD are provided.

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

test('C: auth → social → new message → send', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run this smoke test');

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  // Bypass session-based AgeGate.
  await page.addInitScript(() => {
    sessionStorage.setItem('age_verified', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });

  await page.goto('/auth?next=%2Fsocial');

  await page.getByPlaceholder('your@email.com').fill(String(email));
  await page.getByPlaceholder('Enter password').fill(String(password));
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for auth to resolve and redirect.
  await expect(page).not.toHaveURL(/\/auth(\?|$)/, { timeout: 30_000 });

  // If profile setup is required, complete minimal fields.
  if (await page.getByText('Complete Your Profile').isVisible({ timeout: 3_000 }).catch(() => false)) {
    // Ensure a profile type is selected.
    await page.getByRole('button', { name: 'STANDARD' }).click();

    const cityInput = page.getByPlaceholder('London');
    if (await cityInput.isVisible().catch(() => false)) {
      await cityInput.fill('London');
    }

    // Upload an avatar if the account doesn't already have one.
    const setupSubmit = page.getByRole('button', { name: 'COMPLETE SETUP' });
    if (await setupSubmit.isDisabled().catch(() => false)) {
      const fileInput = page.locator('#avatar-upload');
      if (await fileInput.count()) {
        await fileInput.setInputFiles({
          name: 'avatar.png',
          mimeType: 'image/png',
          buffer: Buffer.from(
            // 1x1 transparent PNG
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAGgwJ/lm8eNwAAAABJRU5ErkJggg==',
            'base64'
          ),
        });
      }
    }

    await expect(setupSubmit).toBeEnabled({ timeout: 10_000 });
    await setupSubmit.click();

    // Should land back on /social (or at least leave /Profile setup UI).
    await expect(page.getByText('Complete Your Profile')).toBeHidden({ timeout: 30_000 });
  }

  await page.goto('/social');
  await expect(page.locator('body')).toBeVisible();

  // Requires profiles to exist; if not, skip rather than failing the suite.
  const messageButtons = page.getByRole('button', { name: 'Message' });
  const messageCount = await messageButtons.count();
  test.skip(messageCount === 0, 'No profiles to message (seed mock profiles to enable this test)');

  await messageButtons.first().click();
  await expect(page).toHaveURL(/\/social\/inbox(\?|$)/);

  // New message modal should open; `to` param should preselect.
  const startButton = page.getByRole('button', { name: 'START CONVERSATION' });
  await expect(startButton).toBeVisible({ timeout: 20_000 });
  await expect(startButton).toBeEnabled({ timeout: 20_000 });
  await startButton.click();

  // Thread view should mount and allow sending.
  const messageInput = page.getByPlaceholder('TYPE MESSAGE...');
  await expect(messageInput).toBeVisible({ timeout: 20_000 });

  const text = `smoke ${Date.now()}`;
  await messageInput.fill(text);
  await messageInput.press('Enter');

  await expect(page.getByText(text)).toBeVisible({ timeout: 20_000 });

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});
