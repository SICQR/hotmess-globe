/**
 * brandColors.test.tsx
 *
 * Smoke test: verifies that the brand accent color #C8962C is present in
 * rendered output of key UI components and that the legacy pink (#FF1493)
 * is NOT used.
 *
 * This is a lightweight DOM assertion test, not a visual regression test.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// RadioMiniPlayer requires RadioContext — provide a minimal mock.
vi.mock('@/contexts/RadioContext', () => ({
  useRadio: () => ({
    isPlaying: true,
    currentShowName: 'Test Show',
    togglePlay: vi.fn(),
    setCurrentShowName: vi.fn(),
    audioRef: { current: null },
  }),
}));

import { RadioMiniPlayer } from '@/components/radio/RadioMiniPlayer';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Brand color enforcement', () => {
  it('RadioMiniPlayer uses #C8962C gold accent, not pink (#FF1493)', () => {
    const { container } = render(
      <MemoryRouter>
        <RadioMiniPlayer />
      </MemoryRouter>,
    );

    const html = container.innerHTML;

    // Must contain the brand gold somewhere in the rendered output
    expect(html).toContain('C8962C');

    // Must NOT contain the legacy pink
    expect(html).not.toContain('FF1493');
  });

  it('RadioMiniPlayer renders brand gold on the radio icon badge', () => {
    const { container } = render(
      <MemoryRouter>
        <RadioMiniPlayer />
      </MemoryRouter>,
    );

    // The amber radio icon badge uses bg-[#C8962C]
    const goldBadge = container.querySelector('[class*="C8962C"]');
    expect(goldBadge).not.toBeNull();
  });
});
