/**
 * 11-market-react-300.spec.ts
 *
 * Regression guard for the historical /market React error #300 crash.
 *
 * React error #300 = "Rendered more hooks than during the previous render".
 * Production-minified surface is the literal string "Minified React error #300"
 * and the link "react.dev/errors/300". This test fails if either signature
 * appears in console or as an uncaught pageerror within the post-hydration window.
 *
 * Verified on prod commit 56d7fa9 (2026-05-17, hotmessldn.com): does NOT throw.
 * The userMemories P0 flag this guards against was the long-standing
 * "/market throws React #300" report — current production has stopped
 * reproducing it. This test keeps it that way.
 *
 * Run: npx playwright test e2e/11-market-react-300.spec.ts --project chromium
 * Prod target: BASE_URL=https://hotmessldn.com npx playwright test e2e/11-market-react-300.spec.ts --project chromium
 */
import { test, expect } from '@playwright/test';

test.describe('/market — React error #300 regression guard', () => {
  test.setTimeout(45_000);

  test('does not throw Minified React error #300 on initial load', async ({ page }) => {
    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      pageErrors.push(`${err.name}: ${err.message}\n${err.stack ?? ''}`);
    });

    await page.goto('/market', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // 12s is well past the typical first-render budget; lets MarketMode mount
    // (Shopify + Preloved + Drops compose into one route — three data sources
    // is the historical hook-order minefield this test catches).
    await page.waitForTimeout(12_000);

    const ERROR_PATTERN = /Minified React error #300|react\.dev\/errors\/300/i;
    const consoleHits = consoleMessages.filter((m) => ERROR_PATTERN.test(m));
    const pageErrorHits = pageErrors.filter((m) => ERROR_PATTERN.test(m));

    // Always print evidence so the test report carries the full console
    // for triage if this ever flips red.
    console.log('--- /market console (last 30) ---');
    console.log(consoleMessages.slice(-30).join('\n'));
    console.log('--- /market pageErrors ---');
    console.log(pageErrors.join('\n') || '(none)');
    console.log(
      `--- summary --- console:${consoleMessages.length} ` +
      `errors:${consoleMessages.filter((m) => m.startsWith('[error]')).length} ` +
      `#300_hits:${consoleHits.length + pageErrorHits.length}`,
    );

    expect(consoleHits, `console contained React #300:\n${consoleHits.join('\n')}`).toHaveLength(0);
    expect(pageErrorHits, `pageError contained React #300:\n${pageErrorHits.join('\n')}`).toHaveLength(0);
  });
});
