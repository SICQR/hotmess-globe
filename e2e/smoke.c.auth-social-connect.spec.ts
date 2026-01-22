import { test, expect, type Locator, type Page } from '@playwright/test';

// This spec uses a single shared credential set; run serially to avoid
// cross-test interference when Playwright uses multiple workers.
test.describe.configure({ mode: 'serial' });

// C = authenticated happy path (optional).
// Skips unless E2E_EMAIL + E2E_PASSWORD are provided.

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

const isVisible = async (locator: Locator, timeout = 1500) => {
  try {
    return await locator.isVisible({ timeout });
  } catch {
    return false;
  }
};

const maybeHandleOnboardingGate = async (page: Page) => {
  const gateHeading = page.getByText('Terms & Conditions');
  const isGate = await isVisible(gateHeading, 1500);
  if (!isGate) return false;

  // Step 1 (Age Verification) can still appear depending on session state.
  const ageHeading = page.getByText('Age Verification');
  if (await isVisible(ageHeading, 500)) {
    await page.getByText('I am 18 years or older').click();
    await page.getByRole('button', { name: 'Continue' }).click();
  }

  // Step 2: Terms & Conditions
  if (await isVisible(gateHeading, 1500)) {
    await page.getByText('I agree to the Terms & Conditions').click();
    await page.getByRole('button', { name: 'Continue' }).click();
  }

  // Step 3: Permissions (data consent required; GPS optional)
  const permissionsHeading = page.getByText('Permissions');
  if (await isVisible(permissionsHeading, 3000)) {
    await page.getByText('Data Collection').click();
    await page.getByRole('button', { name: 'Continue' }).click();
  }

  // Step 4: push into Profile setup if needed.
  const setupProfileBtn = page.getByRole('button', { name: 'Setup Profile' });
  if (await isVisible(setupProfileBtn, 3000)) {
    await setupProfileBtn.click();
  }

  return true;
};

const maybeCompleteProfileSetup = async (page: Page) => {
  const heading = page.getByText('Complete Your Profile');
  if (!(await isVisible(heading, 8000))) return false;

  // Ensure a profile type is selected.
  const standard = page.getByRole('button', { name: /\bSTANDARD\b/i });
  if (await isVisible(standard, 1000)) {
    await standard.scrollIntoViewIfNeeded();
    await standard.click();
  }

  // Always ensure required fields are populated (do not rely on defaults).
  const fullNameInput = page.getByPlaceholder('Enter your name');
  if (await isVisible(fullNameInput, 5000)) {
    await fullNameInput.scrollIntoViewIfNeeded();
    await fullNameInput.fill('E2E Smoke');
    await fullNameInput.press('Tab');
  }

  const cityInput = page.getByPlaceholder('London');
  if (await isVisible(cityInput, 5000)) {
    await cityInput.scrollIntoViewIfNeeded();
    await cityInput.fill('London');
    await cityInput.press('Tab');
  }

  const photoPolicyAck = page.getByRole('checkbox', { name: 'I confirm my profile photos depict men.' });
  if (await isVisible(photoPolicyAck, 5000)) {
    await photoPolicyAck.scrollIntoViewIfNeeded();
    await photoPolicyAck.check();
    await expect(photoPolicyAck).toBeChecked({ timeout: 5000 });
  }

  // Upload a tiny avatar to avoid the submit staying disabled in fresh accounts.
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

  const setupSubmit = page.getByRole('button', { name: 'COMPLETE SETUP' });
  await setupSubmit.scrollIntoViewIfNeeded();
  await expect(setupSubmit).toBeEnabled({ timeout: 20_000 });
  await setupSubmit.click();
  await expect(heading).toBeHidden({ timeout: 30_000 });

  return true;
};

const maybeAcceptMessagingConsentGate = async (page: Page) => {
  const consentHeading = page.getByText('CONSENT CHECK');
  if (!(await isVisible(consentHeading, 1500))) return false;

  // Toggle both checkboxes by clicking their label text.
  await page.getByText('I have read and agree to the community guidelines').click();
  await page.getByText('I confirm I will respect boundaries').click();

  const agree = page.getByRole('button', { name: 'AGREE & SEND' });
  await expect(agree).toBeEnabled({ timeout: 10_000 });
  await agree.click();
  await expect(consentHeading).toBeHidden({ timeout: 20_000 });
  return true;
};

const clearAnyGates = async (page: Page) => {
  let changed = false;

  // Repeat a couple times in case one gate leads to another.
  for (let i = 0; i < 3; i += 1) {
    const handledOnboarding = await maybeHandleOnboardingGate(page);
    const handledProfile = await maybeCompleteProfileSetup(page);
    if (!handledOnboarding && !handledProfile) break;
    changed = true;
  }

  return changed;
};

const gotoSoft = async (page: Page, url: string) => {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    const message = String((error as any)?.message || error);
    // In this SPA, route effects can trigger quick follow-up navigations
    // (e.g. auth/profile redirects), which can abort the initial goto.
    if (!message.includes('net::ERR_ABORTED')) throw error;
  }

  await expect(page.locator('body')).toBeVisible({ timeout: 20_000 });
};

const waitForDiscoverMessageCta = async (
  page: Page,
  {
    timeoutMs = 45_000,
  }: {
    timeoutMs?: number;
  } = {}
) => {
  const startedAt = Date.now();
  const profileGate = page.getByText('Complete Your Profile');
  const messageCta = page.locator(
    '[data-testid="profile-primary-action"][data-action-key="message"]:not([disabled])'
  );

  while (Date.now() - startedAt < timeoutMs) {
    // If the app bounced us to profile setup, clear it and go back to discover.
    if (/\/Profile(\?|$)/.test(page.url()) || (await isVisible(profileGate, 500))) {
      await clearAnyGates(page);
      await gotoSoft(page, '/social?tab=discover');
      continue;
    }

    // If CTA exists and is visible, we're good.
    const first = messageCta.first();
    if (await first.isVisible().catch(() => false)) return messageCta;

    // Wait briefly for either the CTA to appear or for a redirect/gate to surface.
    await Promise.race([
      first.waitFor({ state: 'visible', timeout: 2000 }).catch(() => null),
      profileGate.waitFor({ state: 'visible', timeout: 2000 }).catch(() => null),
      page.waitForURL(/\/Profile(\?|$)/, { timeout: 2000 }).catch(() => null),
    ]);
  }

  return null;
};

const openInboxFromDiscover = async (
  page: Page,
  {
    timeoutMs = 45_000,
  }: {
    timeoutMs?: number;
  } = {}
) => {
  // Always re-drive to the canonical discover tab so we don't rely on stale UI state.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await gotoSoft(page, '/social?tab=discover');

    await clearAnyGates(page);
    // If we got bounced to Profile, clear and retry.
    if (/\/Profile(\?|$)/.test(page.url())) {
      await clearAnyGates(page);
      continue;
    }

    const messageCta = await waitForDiscoverMessageCta(page, { timeoutMs });
    if (!messageCta) return false;

    const first = messageCta.first();
    await first.scrollIntoViewIfNeeded().catch(() => null);
    await expect(first).toBeVisible({ timeout: 15_000 });
    await first.click({ noWaitAfter: true });
    return true;
  }

  return false;
};

type ClickOutcome = 'composer' | 'profile' | 'unknown';

const clickStartConversationRedirectSafe = async ({
  page,
  startButton,
}: {
  page: Page;
  startButton: Locator;
}): Promise<ClickOutcome> => {
  const profileGate = page.getByText('Complete Your Profile');
  const messageInput = page.getByTestId('chat-composer-input');

  // Clicking can trigger a redirect to /Profile?next=... which detaches the button.
  // Treat that as a valid outcome and recover rather than failing the click.
  const waitForProfileUrl = page
    .waitForURL(/\/Profile(\?|$)/, { timeout: 10_000 })
    .then(() => 'profile' as const)
    .catch(() => null);
  const waitForProfileGate = profileGate
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => 'profile' as const)
    .catch(() => null);
  const waitForComposer = messageInput
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => 'composer' as const)
    .catch(() => null);

  await startButton
    .click({ noWaitAfter: true, timeout: 10_000 })
    .catch(async () => {
      // If navigation has already started, the click can fail with a detached node.
      // We'll rely on the waits above to determine the outcome.
    });

  const outcome = await Promise.race([waitForComposer, waitForProfileGate, waitForProfileUrl]);
  return outcome || 'unknown';
};

test.use({
  geolocation: { latitude: 51.5074, longitude: -0.1278 },
  permissions: ['geolocation'],
});

const loginAndClearGates = async ({ page, nextPath }: { page: Page; nextPath: string }) => {
  // Bypass session-based AgeGate.
  await page.addInitScript(() => {
    sessionStorage.setItem('age_verified', 'true');
    sessionStorage.setItem('location_consent', 'false');
  });

  await page.goto(`/auth?next=${encodeURIComponent(nextPath)}`);

  await page.getByPlaceholder('your@email.com').fill(String(email));
  await page.getByPlaceholder('Enter password').fill(String(password));
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for auth to resolve and redirect.
  await expect(page).not.toHaveURL(/\/auth(\?|$)/, { timeout: 30_000 });

  await clearAnyGates(page);
};

test.describe('D: mobile safety widgets', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 13/14-ish

  test('D: panic remains clickable on mobile (assistant present/open)', async ({ page }) => {
    test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run this smoke test');

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await loginAndClearGates({ page, nextPath: '/' });

    const panicButton = page.getByTestId('panic-button');
    await expect(panicButton).toBeVisible({ timeout: 20_000 });

    // Baseline: can click panic and see the confirm dialog.
    await panicButton.click({ timeout: 10_000 });
    await expect(page.getByText('Emergency Panic')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Emergency Panic')).toBeHidden({ timeout: 10_000 });

    // Assistant should not overlap the panic button (closed state).
    const assistantLauncher = page.getByTestId('global-assistant-launcher');
    await expect(assistantLauncher).toBeVisible({ timeout: 20_000 });

    // Open assistant panel and verify panic is still clickable (z-index regression).
    await assistantLauncher.click({ timeout: 10_000 });
    await expect(page.getByTestId('global-assistant-panel')).toBeVisible({ timeout: 20_000 });
    await expect(panicButton).toBeVisible({ timeout: 5_000 });

    await panicButton.click({ timeout: 10_000 });
    await expect(page.getByText('Emergency Panic')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Emergency Panic')).toBeHidden({ timeout: 10_000 });

    await page.getByTestId('global-assistant-close').click({ timeout: 10_000 });
    await expect(page.getByTestId('global-assistant-panel')).toBeHidden({ timeout: 20_000 });

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
  });
});

test('C: auth → social → new message → send', async ({ page }) => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run this smoke test');

  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await loginAndClearGates({ page, nextPath: '/social' });

  // Proactively ensure profile is complete before hitting social messaging flows
  // (some actions call requireProfile and will redirect mid-flow otherwise).
  await page.goto('/Profile');
  await expect(page.locator('body')).toBeVisible();
  await clearAnyGates(page);

  // Social can bounce to Profile if requireProfile detects missing fields.
  // Force the canonical discover tab and retry after clearing gates.
  for (let i = 0; i < 3; i += 1) {
    await page.goto('/social?tab=discover');
    await expect(page.locator('body')).toBeVisible();

    if (/\/Profile(\?|$)/.test(page.url())) {
      await clearAnyGates(page);
      continue;
    }

    await clearAnyGates(page);
    if (!/\/Profile(\?|$)/.test(page.url())) break;
  }

  // Requires profiles to exist; if not, skip rather than failing the suite.
  const initialCta = await waitForDiscoverMessageCta(page, { timeoutMs: 45_000 });
  if (!initialCta) {
    test.skip(true, 'No enabled Message CTA found on Social discover (profiles missing or gated)');
  }

  // The app can redirect to Profile setup mid-flow (requireProfile); don't let the click hang.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const clicked = await openInboxFromDiscover(page, { timeoutMs: 30_000 });
    if (!clicked) {
      test.skip(true, 'No enabled Message CTA found on Social discover (profiles missing or gated)');
    }

    // If Profile setup appears, clear it and retry.
    if (await isVisible(page.getByText('Complete Your Profile'), 1500)) {
      await clearAnyGates(page);
      await page.goto('/social');
      continue;
    }

    await expect(page).toHaveURL(/\/social\/inbox(\?|$)/, { timeout: 20_000 });
    break;
  }

  // New message modal should open; `to` param should preselect.
  // In some environments we can get redirected to Profile after landing on inbox.
  // Also, some flows land on /social/inbox without auto-opening the modal.
  const profileGate = page.getByText('Complete Your Profile');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(page).toHaveURL(/\/social\/inbox(\?|$)/, { timeout: 20_000 });

    if (await isVisible(profileGate, 1500)) {
      await clearAnyGates(page);
      const clicked = await openInboxFromDiscover(page, { timeoutMs: 30_000 });
      if (!clicked) {
        test.skip(true, 'No enabled Message CTA found on Social discover (profiles missing or gated)');
      }
      continue;
    }

    const startButton = page.getByRole('button', { name: /start conversation/i });
    if (!(await isVisible(startButton, 1500))) {
      const newMessage = page.getByRole('button', { name: /new message/i });
      if (await isVisible(newMessage, 3000)) {
        await newMessage.click();
      }
    }

    const dialog = page.getByRole('dialog', { name: /new message/i });
    if (await isVisible(dialog, 2000)) {
      const dialogStart = dialog.getByRole('button', { name: /start conversation/i });

      if (!(await dialogStart.isEnabled().catch(() => false))) {
        const firstUserOption = dialog.locator('button').filter({ hasText: '@' }).first();
        if (await isVisible(firstUserOption, 5000)) {
          await firstUserOption.click();
        }
      }

      await expect(dialogStart).toBeEnabled({ timeout: 20_000 });
      const outcome = await clickStartConversationRedirectSafe({ page, startButton: dialogStart });
      if (outcome === 'profile') {
        await clearAnyGates(page);
        // Re-open compose after completing profile.
        const clicked = await openInboxFromDiscover(page, { timeoutMs: 30_000 });
        if (!clicked) {
          test.skip(true, 'No enabled Message CTA found on Social discover (profiles missing or gated)');
        }
      }
      break;
    }

    await expect(startButton).toBeVisible({ timeout: 20_000 });
    await expect(startButton).toBeEnabled({ timeout: 20_000 });
    const outcome = await clickStartConversationRedirectSafe({ page, startButton });
    if (outcome === 'profile') {
      await clearAnyGates(page);
      const clicked = await openInboxFromDiscover(page, { timeoutMs: 30_000 });
      if (!clicked) {
        test.skip(true, 'No enabled Message CTA found on Social discover (profiles missing or gated)');
      }
    }
    break;
  }

  // Thread view should mount and allow sending.
  // Some environments can redirect to Profile setup here (requireProfile is called on thread create).
  const messageInput = page.getByTestId('chat-composer-input');
  const consentGate = page.getByText('CONSENT CHECK');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Wait briefly for either the composer or a known gate to appear.
    const outcome = await Promise.race([
      messageInput
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => 'composer')
        .catch(() => null),
      profileGate
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => 'profile')
        .catch(() => null),
      consentGate
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => 'consent')
        .catch(() => null),
    ]);

    if (outcome === 'composer') break;

    // Clear any gates we know how to handle.
    await clearAnyGates(page);
    await maybeAcceptMessagingConsentGate(page);

    // Resume the flow: go back to Social, then open compose again.
    const clicked = await openInboxFromDiscover(page, { timeoutMs: 30_000 });
    if (!clicked) {
      test.skip(true, 'No enabled Message CTA found on Social discover (profiles missing or gated)');
    }

    // If we got bounced to Profile again, clear and continue the loop.
    if (await isVisible(profileGate, 5000)) {
      await clearAnyGates(page);
      continue;
    }

    await expect(page).toHaveURL(/\/social\/inbox(\?|$)/, { timeout: 20_000 });
    const restart = page.getByRole('button', { name: 'START CONVERSATION' });
    await expect(restart).toBeVisible({ timeout: 20_000 });
    await expect(restart).toBeEnabled({ timeout: 20_000 });
    const restartOutcome = await clickStartConversationRedirectSafe({ page, startButton: restart });
    if (restartOutcome === 'profile') {
      await clearAnyGates(page);
      continue;
    }
  }

  await expect(messageInput).toBeVisible({ timeout: 20_000 });

  const sendButton = page.getByTestId('chat-composer-send');
  await expect(sendButton).toBeVisible({ timeout: 20_000 });

  const text = `smoke ${Date.now()}`;
  await messageInput.fill(text);
  await expect(messageInput).toHaveValue(text, { timeout: 20_000 });
  await expect(sendButton).toBeEnabled({ timeout: 20_000 });
  await sendButton.click({ timeout: 15_000 });

  await maybeAcceptMessagingConsentGate(page);

  // The sent text appears both in the thread list preview (text-xs) and the message bubble (text-sm).
  // Scope to the bubble to avoid Playwright strict-mode collisions.
  await expect(
    page.locator('p.text-sm.font-medium.leading-relaxed').filter({ hasText: text })
  ).toBeVisible({ timeout: 20_000 });

  expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n\n')}`).toEqual([]);
});
