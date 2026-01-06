/** @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { getBearerToken, normalizeDetails, normalizeShopDomain } from './_utils.js';

describe('api/shopify/_utils', () => {
  it('normalizeShopDomain strips protocol and path', () => {
    expect(normalizeShopDomain('https://example.myshopify.com/admin')).toBe('example.myshopify.com');
    expect(normalizeShopDomain('example.myshopify.com')).toBe('example.myshopify.com');
  });

  it('normalizeDetails accepts objects and parses JSON strings', () => {
    expect(normalizeDetails({ shopify_id: '1' })?.shopify_id).toBe('1');
    expect(normalizeDetails('{"shopify_id":"2"}')?.shopify_id).toBe('2');
    expect(normalizeDetails('not-json')).toBe(null);
  });

  it('getBearerToken extracts bearer token', () => {
    expect(getBearerToken({ headers: { authorization: 'Bearer abc123' } })).toBe('abc123');
    expect(getBearerToken({ headers: { Authorization: 'bearer XYZ' } })).toBe('XYZ');
    expect(getBearerToken({ headers: {} })).toBe(null);
  });
});
