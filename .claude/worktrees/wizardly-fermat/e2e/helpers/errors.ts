/**
 * errors.ts
 * Helper to capture meaningful page errors, filtering out known noise
 */

import { Page } from '@playwright/test';

/**
 * Noise patterns to ignore (WebSocket, Supabase, ResizeObserver, etc.)
 * Returns true if the error message should be ignored.
 */
function isNoiseError(message: string): boolean {
  const noisePatterns = [
    'WebSocket',
    'supabase',
    'ResizeObserver',
    'Non-Error promise rejection',
    'Failed to fetch',
    'Loading chunk',
  ];

  return noisePatterns.some((pattern) => message.includes(pattern));
}

/**
 * Captures page errors from the given page, filtering out noise.
 * Returns an array of error messages to assert against.
 *
 * Usage:
 *   const errors = await capturePageErrors(page);
 *   expect(errors).toHaveLength(0);
 */
export async function capturePageErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('pageerror', (err) => {
    const msg = String(err);
    if (!isNoiseError(msg)) {
      errors.push(msg);
    }
  });

  return errors;
}
