/**
 * Tests for the HMAC ack-token helpers. The signing secret comes from env var
 * SAFETY_ACK_SECRET — these tests set it locally.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { signAckToken, verifyAckToken, buildAckUrl } from '../../api/safety/_ack-token.js';

const SECRET = 'test-ack-secret-must-be-at-least-16-chars';

beforeEach(() => {
  process.env.SAFETY_ACK_SECRET = SECRET;
});

describe('ack-token', () => {
  it('signs and verifies the same delivery+user pair', () => {
    const tok = signAckToken('delivery-1', 'user-1');
    expect(typeof tok).toBe('string');
    expect(tok!.length).toBe(64); // hex sha256
    expect(verifyAckToken('delivery-1', 'user-1', tok!)).toBe(true);
  });

  it('rejects a token bound to a different delivery id', () => {
    const tok = signAckToken('delivery-1', 'user-1');
    expect(verifyAckToken('delivery-2', 'user-1', tok!)).toBe(false);
  });

  it('rejects a token bound to a different user id', () => {
    const tok = signAckToken('delivery-1', 'user-1');
    expect(verifyAckToken('delivery-1', 'user-2', tok!)).toBe(false);
  });

  it('rejects a tampered token', () => {
    const tok = signAckToken('delivery-1', 'user-1')!;
    const tampered = (tok.slice(0, -1) + (tok.endsWith('a') ? 'b' : 'a'));
    expect(verifyAckToken('delivery-1', 'user-1', tampered)).toBe(false);
  });

  it('returns null when secret is too short', () => {
    process.env.SAFETY_ACK_SECRET = 'short';
    expect(signAckToken('a', 'b')).toBeNull();
  });

  it('returns null when secret is missing', () => {
    delete process.env.SAFETY_ACK_SECRET;
    expect(signAckToken('a', 'b')).toBeNull();
  });

  it('verifyAckToken is constant-time-safe to short tokens', () => {
    const tok = signAckToken('delivery-1', 'user-1')!;
    expect(verifyAckToken('delivery-1', 'user-1', tok.slice(0, 10))).toBe(false);
    expect(verifyAckToken('delivery-1', 'user-1', '')).toBe(false);
    expect(verifyAckToken('delivery-1', 'user-1', null as unknown as string)).toBe(false);
  });
});

describe('buildAckUrl', () => {
  it('builds a hotmessldn.com URL with token query', () => {
    const url = buildAckUrl('delivery-1', 'user-1');
    expect(url).toMatch(/^https:\/\/hotmessldn\.com\/api\/safety\/ack\/delivery-1\?token=[0-9a-f]{64}$/);
  });

  it('honours an explicit base URL', () => {
    const url = buildAckUrl('d', 'u', 'https://staging.example.com/');
    expect(url).toMatch(/^https:\/\/staging\.example\.com\/api\/safety\/ack\/d\?token=/);
  });

  it('returns null when secret missing', () => {
    delete process.env.SAFETY_ACK_SECRET;
    expect(buildAckUrl('d', 'u')).toBeNull();
  });
});
