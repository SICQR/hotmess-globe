/**
 * useProfileCompletion.test.ts
 * Unit tests for the useProfileCompletion hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfileCompletion, CompletionStep } from '@/hooks/useProfileCompletion';

// Mock the BootGuardContext
vi.mock('@/contexts/BootGuardContext', () => ({
  useBootGuard: vi.fn(() => ({
    profile: {
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      bio: 'Test bio',
      community_attested_at: '2026-01-01T00:00:00Z',
      push_opt_in: true,
      email: 'test@example.com',
    },
  })),
}));

describe('useProfileCompletion hook', () => {
  it('hook is importable and callable', () => {
    expect(typeof useProfileCompletion).toBe('function');
  });

  it('returns an object with expected properties', () => {
    const { result } = renderHook(() => useProfileCompletion());
    expect(result.current).toHaveProperty('pct');
    expect(result.current).toHaveProperty('steps');
    expect(result.current).toHaveProperty('displayName');
    expect(result.current).toHaveProperty('avatarUrl');
  });

  it('completion percentage is a number between 0-100', () => {
    const { result } = renderHook(() => useProfileCompletion());
    expect(typeof result.current.pct).toBe('number');
    expect(result.current.pct).toBeGreaterThanOrEqual(0);
    expect(result.current.pct).toBeLessThanOrEqual(100);
  });

  it('steps array contains completion step objects', () => {
    const { result } = renderHook(() => useProfileCompletion());
    expect(Array.isArray(result.current.steps)).toBe(true);
    expect(result.current.steps.length).toBeGreaterThan(0);

    result.current.steps.forEach((step: CompletionStep) => {
      expect(step).toHaveProperty('label');
      expect(step).toHaveProperty('done');
      expect(step).toHaveProperty('weight');
      expect(typeof step.label).toBe('string');
      expect(typeof step.done).toBe('boolean');
      expect(typeof step.weight).toBe('number');
    });
  });

  it('displayName is a string', () => {
    const { result } = renderHook(() => useProfileCompletion());
    expect(typeof result.current.displayName).toBe('string');
    expect(result.current.displayName.length).toBeGreaterThan(0);
  });

  it('avatarUrl is either a string or null', () => {
    const { result } = renderHook(() => useProfileCompletion());
    expect(
      result.current.avatarUrl === null || typeof result.current.avatarUrl === 'string'
    ).toBe(true);
  });

  it('completion percentage is deterministic based on profile data', () => {
    const { result: r1 } = renderHook(() => useProfileCompletion());
    const { result: r2 } = renderHook(() => useProfileCompletion());
    expect(r1.current.pct).toBe(r2.current.pct);
    expect(r1.current.steps.length).toBe(r2.current.steps.length);
  });
});
