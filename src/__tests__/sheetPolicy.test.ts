/**
 * sheetPolicy.test.ts
 * Unit tests for canOpenSheet policy enforcement
 */

import { describe, it, expect } from 'vitest';
import { canOpenSheet } from '@/lib/sheetPolicy';

describe('sheetPolicy — canOpenSheet', () => {
  describe('non-gated sheets (always allowed)', () => {
    it('profile sheet always returns true regardless of path or stack', () => {
      expect(canOpenSheet('profile', '/', [])).toBe(true);
      expect(canOpenSheet('profile', '/market', [])).toBe(true);
      expect(canOpenSheet('profile', '/ghosted', [{ type: 'chat' }])).toBe(true);
    });

    it('event sheet always returns true', () => {
      expect(canOpenSheet('event', '/', [])).toBe(true);
      expect(canOpenSheet('event', '/pulse', [])).toBe(true);
    });

    it('product sheet always returns true', () => {
      expect(canOpenSheet('product', '/', [])).toBe(true);
      expect(canOpenSheet('product', '/market', [])).toBe(true);
    });
  });

  describe('gated sheets on /ghosted (allowed)', () => {
    it('chat sheet returns true on /ghosted with empty stack', () => {
      expect(canOpenSheet('chat', '/ghosted', [])).toBe(true);
    });

    it('video sheet returns true on /ghosted with empty stack', () => {
      expect(canOpenSheet('video', '/ghosted', [])).toBe(true);
    });

    it('travel sheet returns true on /ghosted with empty stack', () => {
      expect(canOpenSheet('travel', '/ghosted', [])).toBe(true);
    });

    it('gated sheets return true on /ghosted/* subpaths', () => {
      expect(canOpenSheet('chat', '/ghosted/nearby', [])).toBe(true);
      expect(canOpenSheet('video', '/ghosted/nearby', [])).toBe(true);
      expect(canOpenSheet('travel', '/ghosted/nearby', [])).toBe(true);
    });
  });

  describe('gated sheets with profile in stack (allowed)', () => {
    it('chat sheet returns true when profile sheet is in stack, on non-ghosted path', () => {
      expect(canOpenSheet('chat', '/', [{ type: 'profile' }])).toBe(true);
      expect(canOpenSheet('chat', '/market', [{ type: 'profile' }])).toBe(true);
    });

    it('video sheet returns true when profile sheet is in stack', () => {
      expect(canOpenSheet('video', '/home', [{ type: 'profile' }])).toBe(true);
    });

    it('travel sheet returns true when profile sheet is in stack', () => {
      expect(canOpenSheet('travel', '/pulse', [{ type: 'profile' }])).toBe(true);
    });

    it('profile in stack can have other sheets before it', () => {
      expect(canOpenSheet('chat', '/', [{ type: 'event' }, { type: 'profile' }])).toBe(true);
      expect(canOpenSheet('video', '/', [{ type: 'product' }, { type: 'profile' }, { type: 'event' }])).toBe(true);
    });
  });

  describe('gated sheets blocked outside /ghosted without profile in stack', () => {
    it('chat sheet returns false on / with empty stack', () => {
      expect(canOpenSheet('chat', '/', [])).toBe(false);
    });

    it('video sheet returns false on /market with empty stack', () => {
      expect(canOpenSheet('video', '/market', [])).toBe(false);
    });

    it('travel sheet returns false on /pulse with empty stack', () => {
      expect(canOpenSheet('travel', '/pulse', [])).toBe(false);
    });

    it('chat sheet returns false on /profile path without profile in stack', () => {
      expect(canOpenSheet('chat', '/profile', [])).toBe(false);
    });

    it('gated sheets blocked on /radio path', () => {
      expect(canOpenSheet('chat', '/radio', [])).toBe(false);
      expect(canOpenSheet('video', '/radio', [])).toBe(false);
      expect(canOpenSheet('travel', '/radio', [])).toBe(false);
    });

    it('gated sheets blocked on /vault path', () => {
      expect(canOpenSheet('chat', '/vault', [])).toBe(false);
      expect(canOpenSheet('video', '/vault', [])).toBe(false);
      expect(canOpenSheet('travel', '/vault', [])).toBe(false);
    });

    it('gated sheets blocked with non-profile sheet in stack', () => {
      expect(canOpenSheet('chat', '/', [{ type: 'event' }])).toBe(false);
      expect(canOpenSheet('video', '/home', [{ type: 'product' }])).toBe(false);
      expect(canOpenSheet('travel', '/market', [{ type: 'beacon' }])).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('empty sheet stack behaves correctly', () => {
      expect(canOpenSheet('profile', '/', [])).toBe(true);
      expect(canOpenSheet('chat', '/', [])).toBe(false);
    });

    it('undefined / null handling', () => {
      // Type system should prevent these, but test defensively
      expect(canOpenSheet('unknown', '/', [])).toBe(true); // Non-gated = allowed
    });

    it('case sensitivity (lowercase expected)', () => {
      // The function uses includes, so 'Chat' !== 'chat'
      expect(canOpenSheet('Chat', '/', [])).toBe(true); // 'Chat' not in gated list
      expect(canOpenSheet('chat', '/', [])).toBe(false);
    });
  });
});
