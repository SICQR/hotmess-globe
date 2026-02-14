import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getGuestCartItems,
  setGuestCartItems,
  clearGuestCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  mergeGuestCartToUser,
} from './cartStorage';
import { base44 } from '@/components/utils/supabaseClient';

// Mock the supabase client
vi.mock('@/components/utils/supabaseClient', () => ({
  base44: {
    auth: {
      me: vi.fn(),
    },
    entities: {
      CartItem: {
        filter: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  },
}));

describe('cartStorage - Guest Cart Persistence', () => {
  const GUEST_CART_STORAGE_KEY = 'hotmess_guest_cart_v1';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('localStorage Persistence', () => {
    it('should return empty array when no cart exists in localStorage', () => {
      const items = getGuestCartItems();
      expect(items).toEqual([]);
      expect(Array.isArray(items)).toBe(true);
    });

    it('should persist cart items to localStorage', () => {
      const testItems = [
        { product_id: '123', quantity: 2, reserved_until: new Date().toISOString() },
        { product_id: '456', quantity: 1, reserved_until: new Date().toISOString() },
      ];

      setGuestCartItems(testItems);

      const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored);
      expect(parsed).toEqual(testItems);
    });

    it('should restore cart items from localStorage', () => {
      const testItems = [
        { product_id: '789', quantity: 3, reserved_until: new Date().toISOString() },
      ];

      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(testItems));

      const retrieved = getGuestCartItems();
      expect(retrieved).toEqual(testItems);
    });

    it('should persist cart across page refreshes', () => {
      const testItems = [
        { product_id: 'product-1', quantity: 1, reserved_until: new Date().toISOString() },
        { product_id: 'product-2', quantity: 2, reserved_until: new Date().toISOString() },
      ];

      // First "page load" - add items
      setGuestCartItems(testItems);
      
      // Verify items are in localStorage
      const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      expect(stored).toBeTruthy();

      // Simulate page reload by clearing in-memory state (localStorage persists)
      // In a real scenario, the component would unmount and remount

      // Second "page load" - restore items
      const retrieved = getGuestCartItems();
      expect(retrieved).toEqual(testItems);
      expect(retrieved.length).toBe(2);
    });

    it('should clear cart from localStorage', () => {
      const testItems = [
        { product_id: 'clear-test', quantity: 1, reserved_until: new Date().toISOString() },
      ];

      setGuestCartItems(testItems);
      expect(localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeTruthy();

      clearGuestCart();
      expect(localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBe(null);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid JSON
      localStorage.setItem(GUEST_CART_STORAGE_KEY, 'invalid json {{{');

      const items = getGuestCartItems();
      expect(items).toEqual([]);
    });

    it('should handle non-array data in localStorage', () => {
      // Set non-array data
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify({ not: 'an array' }));

      const items = getGuestCartItems();
      expect(items).toEqual([]);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw errors
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error('localStorage error');
      });

      // Should not crash
      expect(() => getGuestCartItems()).not.toThrow();
      const items = getGuestCartItems();
      expect(items).toEqual([]);

      // Restore
      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe('Cart Operations with Persistence', () => {
    it('should add item to guest cart and persist to localStorage', async () => {
      // Mock user not authenticated
      base44.auth.me.mockResolvedValue(null);

      await addToCart({
        productId: 'test-product-123',
        quantity: 2,
        currentUser: null,
      });

      const items = getGuestCartItems();
      expect(items.length).toBe(1);
      expect(items[0].product_id).toBe('test-product-123');
      expect(items[0].quantity).toBe(2);

      // Verify localStorage persistence
      const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      expect(stored).toBeTruthy();
    });

    it('should update quantity and persist changes', async () => {
      // Pre-populate cart
      const testItems = [
        { product_id: 'update-test', quantity: 1, reserved_until: new Date().toISOString() },
      ];
      setGuestCartItems(testItems);

      await updateCartItemQuantity({
        productId: 'update-test',
        quantity: 5,
        currentUser: null,
      });

      const items = getGuestCartItems();
      expect(items[0].quantity).toBe(5);

      // Verify localStorage updated
      const stored = JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY));
      expect(stored[0].quantity).toBe(5);
    });

    it('should remove item and persist changes', async () => {
      // Pre-populate cart with multiple items
      const testItems = [
        { product_id: 'keep-me', quantity: 1, reserved_until: new Date().toISOString() },
        { product_id: 'remove-me', quantity: 2, reserved_until: new Date().toISOString() },
      ];
      setGuestCartItems(testItems);

      await removeFromCart({
        productId: 'remove-me',
        currentUser: null,
      });

      const items = getGuestCartItems();
      expect(items.length).toBe(1);
      expect(items[0].product_id).toBe('keep-me');

      // Verify localStorage updated
      const stored = JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY));
      expect(stored.length).toBe(1);
    });

    it('should merge guest cart with variant support', async () => {
      // Pre-populate guest cart with items that have variants
      const guestItems = [
        {
          product_id: 'shirt-123',
          quantity: 2,
          shopify_variant_id: 'variant-small',
          variant_title: 'Small',
          reserved_until: new Date(Date.now() + 1000000).toISOString(),
        },
        {
          product_id: 'shirt-123',
          quantity: 1,
          shopify_variant_id: 'variant-large',
          variant_title: 'Large',
          reserved_until: new Date(Date.now() + 1000000).toISOString(),
        },
      ];
      setGuestCartItems(guestItems);

      // Mock authenticated user
      const mockUser = { email: 'test@example.com', auth_user_id: 'user-123' };
      base44.auth.me.mockResolvedValue(mockUser);
      base44.entities.CartItem.filter.mockResolvedValue([]);
      base44.entities.CartItem.create.mockResolvedValue({});

      await mergeGuestCartToUser({ currentUser: mockUser });

      // Verify both variants were merged (2 separate DB inserts)
      expect(base44.entities.CartItem.create).toHaveBeenCalledTimes(2);

      // Verify guest cart was cleared after merge
      const remainingItems = getGuestCartItems();
      expect(remainingItems).toEqual([]);
      expect(localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBe(null);
    });
  });

  describe('Cart Persistence Across Authentication States', () => {
    it('should maintain cart in localStorage for guest users', async () => {
      base44.auth.me.mockResolvedValue(null);

      // Add items as guest
      await addToCart({ productId: 'item-1', quantity: 1, currentUser: null });
      await addToCart({ productId: 'item-2', quantity: 2, currentUser: null });

      const items = getGuestCartItems();
      expect(items.length).toBe(2);

      // Verify persistence
      const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      expect(stored).toBeTruthy();

      // Simulate "page refresh" by retrieving items again
      const itemsAfterRefresh = getGuestCartItems();
      expect(itemsAfterRefresh.length).toBe(2);
      expect(itemsAfterRefresh[0].product_id).toBe('item-1');
      expect(itemsAfterRefresh[1].product_id).toBe('item-2');
    });

    it('should preserve cart when user logs in (before merge)', async () => {
      base44.auth.me.mockResolvedValue(null);

      // Add items as guest
      await addToCart({ productId: 'pre-login', quantity: 3, currentUser: null });

      const guestItems = getGuestCartItems();
      expect(guestItems.length).toBe(1);

      // Verify localStorage has the items
      const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
      expect(stored).toBeTruthy();

      // User logs in (cart should still be in localStorage until merged)
      const mockUser = { email: 'newuser@example.com', auth_user_id: 'user-456' };
      base44.auth.me.mockResolvedValue(mockUser);

      // Items should still be in guest cart
      const itemsAfterLogin = getGuestCartItems();
      expect(itemsAfterLogin.length).toBe(1);
      expect(itemsAfterLogin[0].product_id).toBe('pre-login');
    });
  });

  describe('Edge Cases', () => {
    it('should handle adding same product multiple times', async () => {
      base44.auth.me.mockResolvedValue(null);

      await addToCart({ productId: 'duplicate-test', quantity: 1, currentUser: null });
      await addToCart({ productId: 'duplicate-test', quantity: 2, currentUser: null });

      const items = getGuestCartItems();
      // Should have combined quantities
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(3);
    });

    it('should update reserved_until timestamp on quantity updates', async () => {
      const oldTimestamp = new Date(Date.now() - 1000000).toISOString();
      setGuestCartItems([
        { product_id: 'timestamp-test', quantity: 1, reserved_until: oldTimestamp },
      ]);

      await updateCartItemQuantity({
        productId: 'timestamp-test',
        quantity: 2,
        currentUser: null,
      });

      const items = getGuestCartItems();
      expect(items[0].reserved_until).not.toBe(oldTimestamp);
      expect(new Date(items[0].reserved_until).getTime()).toBeGreaterThan(Date.now() - 60000);
    });

    it('should handle removing non-existent item gracefully', async () => {
      setGuestCartItems([
        { product_id: 'existing', quantity: 1, reserved_until: new Date().toISOString() },
      ]);

      await removeFromCart({
        productId: 'non-existent',
        currentUser: null,
      });

      const items = getGuestCartItems();
      expect(items.length).toBe(1);
      expect(items[0].product_id).toBe('existing');
    });
  });
});
