/**
 * useProfileCompletion.test.ts
 * Basic unit tests for the useProfileCompletion hook
 */

import { describe, it, expect, vi } from 'vitest';
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
    // This test just verifies the hook can be imported without errors
    expect(typeof useProfileCompletion).toBe('function');
  });

  it('returns an object with expected properties', () => {
    // We can't actually render the hook in a unit test without a component,
    // but we can verify the function exists and has the right signature
    const result = useProfileCompletion();

    expect(result).toHaveProperty('pct');
    expect(result).toHaveProperty('steps');
    expect(result).toHaveProperty('displayName');
    expect(result).toHaveProperty('avatarUrl');
  });

  it('completion percentage is a number between 0-100', () => {
    const result = useProfileCompletion();
    expect(typeof result.pct).toBe('number');
    expect(result.pct).toBeGreaterThanOrEqual(0);
    expect(result.pct).toBeLessThanOrEqual(100);
  });

  it('steps array contains completion step objects', () => {
    const result = useProfileCompletion();

    expect(Array.isArray(result.steps)).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);

    result.steps.forEach((step: CompletionStep) => {
      expect(step).toHaveProperty('label');
      expect(step).toHaveProperty('done');
      expect(step).toHaveProperty('weight');

      expect(typeof step.label).toBe('string');
      expect(typeof step.done).toBe('boolean');
      expect(typeof step.weight).toBe('number');
    });
  });

  it('displayName is a string', () => {
    const result = useProfileCompletion();
    expect(typeof result.displayName).toBe('string');
    expect(result.displayName.length).toBeGreaterThan(0);
  });

  it('avatarUrl is either a string or null', () => {
    const result = useProfileCompletion();
    expect(result.avatarUrl === null || typeof result.avatarUrl === 'string').toBe(true);
  });

  it('completion percentage is deterministic based on profile data', () => {
    // Call the hook multiple times and verify it returns the same result
    const result1 = useProfileCompletion();
    const result2 = useProfileCompletion();

    expect(result1.pct).toBe(result2.pct);
    expect(result1.steps.length).toBe(result2.steps.length);
  });
});
