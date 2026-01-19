import { describe, expect, it } from 'vitest';
import { createCodeChallenge, createCodeVerifier, createState } from './_pkce.js';

describe('soundcloud pkce', () => {
  it('creates verifier within RFC length', () => {
    const v = createCodeVerifier();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
  });

  it('creates a code challenge for a verifier', () => {
    const v = createCodeVerifier();
    const c = createCodeChallenge(v);
    expect(typeof c).toBe('string');
    expect(c.length).toBeGreaterThan(0);
    expect(c).not.toEqual(v);
  });

  it('creates a state value', () => {
    const s = createState();
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });
});
