/**
 * P0 guard test — confirms safeName NEVER returns a user email.
 * Phil 2026-05-28: catastrophic email-as-display-name leak fixed; this
 * test ensures the fallback chain can't regress to leaking @-containing
 * strings.
 */
import { describe, it, expect } from 'vitest';
import { safeName } from './safeName';

describe('safeName — Sacred Invariant: never leaks email to other users', () => {
  it('returns display_name when present', () => {
    expect(safeName({ display_name: 'Phil' })).toBe('Phil');
  });

  it('returns Member when display_name is null', () => {
    expect(safeName({ display_name: null, email: 'leak@example.com' })).toBe('Member');
  });

  it('returns Member when display_name is empty string', () => {
    expect(safeName({ display_name: '', email: 'leak@example.com' })).toBe('Member');
  });

  it('returns Member when display_name accidentally contains @', () => {
    // Defensive: someone slips an email into display_name somehow
    expect(safeName({ display_name: 'leak@example.com' })).toBe('Member');
  });

  it('returns Member when user is null', () => {
    expect(safeName(null)).toBe('Member');
  });

  it('returns Member when user is undefined', () => {
    expect(safeName(undefined)).toBe('Member');
  });

  it('accepts displayName camelCase variant', () => {
    expect(safeName({ displayName: 'Phil' })).toBe('Phil');
  });

  it('accepts name variant', () => {
    expect(safeName({ name: 'Phil' })).toBe('Phil');
  });

  it('respects custom fallback', () => {
    expect(safeName({}, 'Anonymous')).toBe('Anonymous');
  });

  it('never returns email even when only email is provided', () => {
    const result = safeName({ email: 'leak@example.com' });
    expect(result).not.toContain('@');
    expect(result).toBe('Member');
  });
});
